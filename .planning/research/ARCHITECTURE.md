# Architecture Patterns

**Domain:** Brownfield integration — institution-scoping, video provider abstraction, anti-piracy watermark, certificate issuance, B2B manager dashboard
**Researched:** 2026-04-27

---

## Constraint Envelope (Do Not Violate)

Everything below must fit inside the existing locked architecture:

- Middleware at `middleware.ts` is the single auth gatekeeper
- Three Supabase client factories: browser / server-cookie / admin service-role — do not add a fourth
- Server Actions for mutations; API routes only when HTTP-callable
- RLS enforced at DB level; admin client usage must be justified inline
- All input validation through Zod schemas in `src/lib/**/schema.ts`
- Path alias `@/*` → `src/*`
- `src/lib/env.ts` for every env var — never `process.env` directly in feature code
- Migrations manually numbered `supabase/migrations/NNNN_*.sql`; `database.types.ts` hand-synced after each one

---

## 1. Institution-Scoping Data Model

### Schema Changes (migration 0012)

Add one new enum value, two tables, and one FK column.

```sql
-- 1. Extend the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'gestor_instituicao';

-- 2. Institutions table
CREATE TABLE IF NOT EXISTS public.institutions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Institution memberships  (student ↔ institution, gestor ↔ institution)
CREATE TABLE IF NOT EXISTS public.institution_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           public.user_role NOT NULL DEFAULT 'student',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_institution_members_user_id
  ON public.institution_members (user_id);
CREATE INDEX IF NOT EXISTS idx_institution_members_institution_id
  ON public.institution_members (institution_id);

-- 4. Add institution_id to enrollments (nullable — B2C enrollments have NULL)
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS institution_id uuid
  REFERENCES public.institutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_institution_id
  ON public.enrollments (institution_id);
```

**Why `institution_members` is separate from `enrollments`:** A student's enrollment is per-course. Institution membership is a persistent relationship regardless of which courses the student takes. Keeping them separate avoids a fan-out problem when an institution buys additional courses later.

### Postgres Helper Function

Centralise the "is this user a member of this institution?" check so every RLS policy reuses one tested path. Mark it `STABLE` so Postgres can cache it per query.

```sql
CREATE OR REPLACE FUNCTION public.is_member_of_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members
    WHERE institution_id = p_institution_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_gestor_of_institution(p_institution_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_members
    WHERE institution_id = p_institution_id
      AND user_id = auth.uid()
      AND role = 'gestor_instituicao'
  );
$$;
```

**`SECURITY DEFINER` justification:** These functions need to read `institution_members` with elevated rights so they work inside RLS policies on other tables without creating circular permission chains. `SET search_path = public` prevents search path injection.

### RLS Policy Shapes

#### `institutions` table

```sql
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- MDHE admin: full access
CREATE POLICY "admin_all_institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Gestor: read own institution only
CREATE POLICY "gestor_read_own_institution"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (
    public.is_gestor_of_institution(id)
  );
```

#### `institution_members` table

```sql
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;

-- MDHE admin: full access
CREATE POLICY "admin_all_institution_members"
  ON public.institution_members FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Gestor: read members of OWN institution only (never another institution's)
CREATE POLICY "gestor_read_own_institution_members"
  ON public.institution_members FOR SELECT
  TO authenticated
  USING (
    public.is_gestor_of_institution(institution_id)
  );

-- Student: read only their own membership row
CREATE POLICY "student_read_own_membership"
  ON public.institution_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );
```

#### `lesson_progress` — gestor aggregate read

The gestor dashboard needs progress aggregates across all students of their institution. Add a SELECT policy that allows this without opening it to all authenticated users:

```sql
-- existing student-owns-row policy preserved (auth.uid() = user_id)

-- Gestor: read progress rows for users who belong to their institution
CREATE POLICY "gestor_read_institution_progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.institution_members im
      WHERE im.user_id = lesson_progress.user_id
        AND public.is_gestor_of_institution(im.institution_id)
    )
  );
```

#### `course_certificates` — gestor aggregate read

```sql
-- existing student-owns-row policy and admin-all policy preserved

-- Gestor: read certificates of their institution's students
CREATE POLICY "gestor_read_institution_certificates"
  ON public.course_certificates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.institution_members im
      WHERE im.user_id = course_certificates.user_id
        AND public.is_gestor_of_institution(im.institution_id)
    )
  );
```

### TypeScript Surface Changes

Add to `database.types.ts`:
- `institutions` table Row/Insert/Update
- `institution_members` table Row/Insert/Update
- `user_role` enum gains `'gestor_instituicao'`
- `enrollments.institution_id: string | null`

Add to `src/lib/institutions/` (new domain module):
- `queries.ts` — `getInstitutionByGestor(userId)`, `getInstitutionMembers(institutionId)`, `getMemberProgressSummary(institutionId)`
- `schema.ts` — Zod schemas for institution creation (admin only in v1)
- `types.ts` — `InstitutionRow`, `InstitutionMemberRow`, `MemberProgressSummary`

---

## 2. Video Provider Abstraction

### Rationale

The current `LessonPlayer` has YouTube baked in (`extractYouTubeVideoId`, `loadYouTubeIframeApi`). Replacing YouTube with Bunny Stream in production requires touching only the provider adapter, not the player component or the lesson data model.

### Database Changes (migration 0013)

Add provider columns to `lessons`. Keep `video_url` for YouTube (dev), add nullable provider columns for Bunny (prod). Both can be null or populated; the resolver picks the right one.

```sql
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_provider text
    CHECK (video_provider IN ('youtube', 'bunny')) DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS video_external_id text;
-- video_url is kept and repurposed: for youtube it's the watch URL,
-- for bunny it's unused (external_id is the library+video ref).
-- A null video_external_id means admin hasn't set video yet.
```

### TypeScript Interface

Location: `src/lib/video/types.ts`

```typescript
// The discriminated union of what any provider can return
export type PlayableSource =
  | {
      provider: 'youtube';
      embedUrl: string;       // https://www.youtube.com/embed/{id}?rel=0
      hlsUrl: null;
      playerToken: null;
      watermarkText: string;  // student email — rendered as CSS overlay
    }
  | {
      provider: 'bunny';
      embedUrl: string;       // https://iframe.mediadelivery.net/embed/{libId}/{videoId}?token={tok}&expires={exp}
      hlsUrl: string;         // https://vz-{zone}.b-cdn.net/{videoId}/playlist.m3u8 (optional direct HLS)
      playerToken: string;    // hex SHA256 — already embedded in embedUrl, exposed for logging
      watermarkText: string;  // student email — rendered as CSS overlay
    };

export interface VideoProvider {
  /**
   * Returns a PlayableSource for the given lesson and requesting user.
   * MUST run server-side only. Bunny token key never leaves the server.
   */
  getPlayableSource(
    lesson: { video_provider: string; video_external_id: string | null; video_url: string },
    user: { id: string; email: string }
  ): Promise<PlayableSource>;
}
```

### Provider Implementations

Location: `src/lib/video/`

```
src/lib/video/
  types.ts              — interfaces above
  youtube-provider.ts   — YouTubeVideoProvider implements VideoProvider
  bunny-provider.ts     — BunnyVideoProvider implements VideoProvider (server-only)
  get-provider.ts       — factory: returns correct provider based on env/lesson
```

**`youtube-provider.ts`** — pure, no secrets needed:

```typescript
// src/lib/video/youtube-provider.ts
export class YouTubeVideoProvider implements VideoProvider {
  async getPlayableSource(lesson, user): Promise<PlayableSource> {
    const id = extractYouTubeVideoId(lesson.video_url);
    return {
      provider: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0`,
      hlsUrl: null,
      playerToken: null,
      watermarkText: user.email,
    };
  }
}
```

**`bunny-provider.ts`** — server-only, reads secrets via `getEnv()`:

```typescript
// src/lib/video/bunny-provider.ts
// "use server" is not needed — just never import from a client component
import crypto from 'crypto';
import { getEnv } from '@/lib/env';

export class BunnyVideoProvider implements VideoProvider {
  async getPlayableSource(lesson, user): Promise<PlayableSource> {
    const { BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_TOKEN_KEY } = getEnv();
    const videoId = lesson.video_external_id!;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1h expiry

    // Bunny embed token: SHA256(tokenKey + videoId + expires) → hex
    const raw = `${BUNNY_STREAM_TOKEN_KEY}${videoId}${expiresAt}`;
    const token = crypto.createHash('sha256').update(raw).digest('hex');

    const embedUrl =
      `https://iframe.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}` +
      `?token=${token}&expires=${expiresAt}`;

    const hlsUrl =
      `https://vz-${getEnv().BUNNY_STREAM_CDN_ZONE}.b-cdn.net/${videoId}/playlist.m3u8` +
      `?token=${token}&expires=${expiresAt}`;

    return {
      provider: 'bunny',
      embedUrl,
      hlsUrl,
      playerToken: token,
      watermarkText: user.email,
    };
  }
}
```

**`get-provider.ts`** — factory that picks provider by lesson's `video_provider` column:

```typescript
// src/lib/video/get-provider.ts
export function getVideoProvider(providerName: string): VideoProvider {
  if (providerName === 'bunny') return new BunnyVideoProvider();
  return new YouTubeVideoProvider(); // default / dev
}
```

### Where the Provider Connects to the Player

The lesson Server Component (`src/app/curso/[slug]/aula/[lessonId]/page.tsx`) already runs server-side. This is the correct insertion point:

1. Page fetches lesson data (existing `getLessonWithCourseContext`)
2. Page calls `getVideoProvider(lesson.video_provider).getPlayableSource(lesson, user)` — server-only, Bunny key never leaves server
3. Page passes `PlayableSource` as a prop to `LessonPlayer` (client component)
4. `LessonPlayer` receives a ready-to-use `embedUrl` — no provider detection needed in the browser

The client component `LessonPlayer` needs to be refactored to accept `PlayableSource` instead of `lesson.video_url`. The YouTube API initialisation logic stays in a `YouTubePlayerEmbed` sub-component, loaded only when `source.provider === 'youtube'`.

### New Env Vars (add to `src/lib/env.ts` serverSchema)

```typescript
BUNNY_STREAM_LIBRARY_ID: z.string().min(1),
BUNNY_STREAM_TOKEN_KEY: z.string().min(1),
BUNNY_STREAM_CDN_ZONE: z.string().min(1),
```

These are server-only secrets. Never add to `clientSchema`.

---

## 3. Anti-Piracy Watermark

### Option Analysis

| Approach | How it works | Bypassable? | Implementation effort | Encoding cost |
|----------|-------------|-------------|----------------------|---------------|
| **CSS overlay (client-side)** | Absolutely-positioned semi-transparent `<div>` over the video iframe with student email | Yes — DevTools, iframe sandbox tricks, screen record without overlay | Low — pure React/CSS | None |
| **Bunny server-side static watermark** | Bunny re-encodes the video with a visible watermark baked into frames (dashboard/API setting) | No — burned into video | Medium — Bunny re-encode per video | High — doubles encode time |
| **Dynamic client-side overlay** | CSS overlay with `pointer-events: none`, `user-select: none`, randomised position every N seconds | Partially — screen recording captures overlay; DevTools can disable it | Low–medium | None |
| **Sidecar VTT watermark** | Custom text track with student info displayed as subtitle | Yes — can be disabled in player | Low | None |

**Recommendation: CSS overlay (dynamic position, partially mitigating).**

Rationale:
- Bunny does not expose a dynamic per-user text watermark API. Static watermarks burn in branding text, not per-student email. Implementing per-student Bunny watermarks would require re-encoding a unique video copy per student, which is impractical at any scale and was not designed for this use case.
- The threat model for MDHE is casual piracy (sharing login credentials, screen-recording and re-distributing). A visible email watermark deters this even if technically bypassable, because the leaker's identity is visible in leaked video. This is the same model used by major streaming services (Netflix, Disney+) for screener watermarks.
- CSS overlay is sufficient deterrence for the MDHE content category (training videos for school safety staff). Content is not a high-value commercial film.

**Implementation:**

Create `src/components/course/watermark-overlay.tsx` (client component):

```tsx
"use client";
import { useEffect, useState } from "react";

type WatermarkOverlayProps = {
  email: string;
};

export function WatermarkOverlay({ email }: WatermarkOverlayProps) {
  // Randomise position every 30s to reduce corner-crop bypass
  const [pos, setPos] = useState({ top: '10%', left: '10%' });

  useEffect(() => {
    const id = setInterval(() => {
      setPos({
        top: `${10 + Math.random() * 75}%`,
        left: `${5 + Math.random() * 60}%`,
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        pointerEvents: 'none',
        userSelect: 'none',
        opacity: 0.35,
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: 600,
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap',
        zIndex: 10,
      }}
    >
      {email}
    </div>
  );
}
```

Wrap the video area in `LessonPlayer` in a `position: relative` container and render `<WatermarkOverlay email={source.watermarkText} />` on top. The `watermarkText` field comes from `PlayableSource`, which the server sets to the authenticated user's email. The client component never calls `getUser()` directly — the email is passed as a prop from the server.

**Tradeoff summary to document in code:**
- Overlay is visible in screen recordings (intended — deters casual sharing)
- Overlay can be removed via browser DevTools — accepted risk for this use case
- No re-encoding cost — video delivery is unmodified
- Bunny embed iframe sandboxing means CSS from the parent page cannot pierce the iframe; the overlay goes on the container `div` wrapping the iframe, not inside it

---

## 4. Certificate Issuance Flow

### Current State

The existing `ensureCourseCertificateIssued` in `src/lib/certificates/issuer.ts` already handles:
- Idempotency: checks `course_certificates` for existing row before generating
- Concurrent race: catches `23505` unique violation, returns existing cert
- Storage: uploads to `certificates/{courseId}/{userId}/{ts}-{code}.pdf`
- `unique(user_id, course_id)` constraint at DB level

What is missing for the full v1 flow:

### Trigger Point

Currently, certificate generation is lazy (triggered when student clicks "Baixar certificado"). The requirement is **automatic issuance when the last lesson is marked complete** — not requiring an extra click.

**Recommendation: Keep lazy generation at download time for PDF, but trigger eligibility computation eagerly.**

Full synchronous PDF generation inside the lesson-complete API route would add 2–5 seconds to a latency-sensitive path (POST `/api/lesson-progress/complete`). The right split:

1. `POST /api/lesson-progress/complete` completes as today — marks lesson done, returns updated progress
2. Response includes a `courseCompleted: boolean` flag (already determinable from progress rollup)
3. `LessonPlayer` receives `courseCompleted: true` → shows "Parabens! Curso concluido. Seu certificado esta disponivel." with a link to `/dashboard`
4. When student navigates to dashboard and clicks download, `POST /api/certificates/signed-url` triggers `ensureCourseCertificateIssued` — PDF is generated and cached on first call (idempotent on subsequent calls)

This avoids the PDF generation blocking the completion response while still making the certificate immediately accessible.

**Alternative (background job) is out of scope for v1** — no background queue infrastructure exists. Supabase Edge Functions could be used but add operational complexity. Defer to v2 only if PDF generation time becomes a real user complaint.

### Idempotency (already handled, note for clarity)

The `unique(user_id, course_id)` constraint in `course_certificates` combined with the race-condition handling in `ensureCourseCertificateIssued` (lines 145–153 of issuer.ts) already guarantees exactly-once issuance per student per course. No additional idempotency work needed.

### Revocation

Currently not supported (no `revoked_at` column, no `is_revoked` flag). For v1, revocation is not in scope. When needed (v2), add:

```sql
ALTER TABLE public.course_certificates
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text;
```

The signed URL endpoint should check `revoked_at IS NULL` before issuing the download URL.

### Re-issue if Student Name Changes

The current flow resolves `userDisplayName` from `profiles.full_name` at generation time and bakes it into the PDF. If the name changes later, the stored PDF is stale.

Recommended approach for v1: Do nothing (name changes are rare and the admin can manually re-issue if needed by deleting the `course_certificates` row — the next download click regenerates). Document this in CLAUDE.md.

For v2: Add a `profile_snapshot_full_name text` column to `course_certificates` so the issuer can detect staleness and optionally re-generate.

### Certificate Flow (final summary)

```
lesson complete click
  → POST /api/lesson-progress/complete
  → upsert lesson_progress
  → recalculate course completion %
  → if 100%: set courseCompleted: true in response
  → LessonPlayer shows "curso concluido" banner

student clicks download
  → POST /api/certificates/signed-url { courseId }
  → ensureCourseCertificateIssued(userId, courseId)
    → if already_issued: return existing cert
    → verify 100% completion
    → generatePdf (2–5s, first call only)
    → upload to storage certificates/{courseId}/{userId}/...
    → insert course_certificates row
  → createSignedUrl (5 min expiry) via admin client
  → return { url, certificateCode, issuedAt }
```

---

## 5. B2B Manager Dashboard Surface

### Recommendation: New `/gestor/` route tree, NOT inside `/admin/`

**Rationale:**

- `/admin/` is protected by `role === 'admin'` in middleware. The `gestor_instituicao` role must never reach admin. Mixing gestor views inside `/admin/` would require loosening that guard or adding complex role branching to admin pages that are currently simple.
- A separate `/gestor/` route makes the permission model obvious: middleware adds one new rule, one new route prefix. The gestor's view is entirely scoped to their institution.
- Future gestores from different institutions could exist. Separate routes keep that clean.

### Middleware Change

Add to `middleware.ts`:

```typescript
const GESTOR_ROUTES = ["/gestor"];

function isGestorPath(path: string) {
  return GESTOR_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

// Inside middleware():
if (user && isGestorPath(path)) {
  const role = await fetchUserRole(supabase, user.id);
  if (role !== 'gestor_instituicao' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

Also update `config.matcher` to add `"/gestor/:path*"`.

### Route Structure

```
src/app/gestor/
  layout.tsx                    — layout with gestor nav
  page.tsx                      — redirect to /gestor/[institutionSlug]
  [institutionSlug]/
    page.tsx                    — institution overview + member list
    progresso/
      page.tsx                  — progress table (% per student per course)
    certificados/
      page.tsx                  — certificates issued table (student, course, date, download link)
```

The `institutionSlug` is resolved on the server by querying `institution_members` for the logged-in user's `gestor_instituicao` membership. A gestor will always have exactly one institution in v1 (admin invites 1:1). If the gestor has no institution, redirect to `/dashboard` with an error message.

### Data Queries (gestor-scoped, RLS-enforced)

These queries use the **server client** (cookie-bound, not admin). RLS policies defined in Section 1 enforce that the gestor only sees their own institution's data — no admin client needed here.

```typescript
// src/lib/institutions/queries.ts

// Returns the institution the logged-in gestor manages (null if none)
export async function getGestorInstitution(supabase, userId): Promise<InstitutionRow | null>

// Returns all members of an institution (uses RLS — only gestor of that inst can call)
export async function getInstitutionMembers(supabase, institutionId): Promise<MemberRow[]>

// Aggregated progress: for each member, for each enrolled course, % complete
export async function getMemberProgressSummary(supabase, institutionId): Promise<MemberProgressSummary[]>

// Certificates issued for members of this institution
export async function getInstitutionCertificates(supabase, institutionId): Promise<InstitutionCertificateSummary[]>
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Notes |
|-----------|---------------|-------------------|-------|
| `middleware.ts` | Auth gatekeeper, role enforcement for `/gestor/` | Supabase server client | Add GESTOR_ROUTES |
| `src/lib/institutions/` | Institution domain: queries, schema, types | Supabase server/admin clients | New module |
| `src/lib/video/` | Video provider abstraction + PlayableSource resolution | `src/lib/env.ts`, crypto | Server-only for Bunny |
| `src/components/course/watermark-overlay.tsx` | CSS watermark over video iframe | Props from LessonPlayer | Client component |
| `src/components/course/lesson-player.tsx` | Refactored to accept PlayableSource | WatermarkOverlay, VideoEmbed subcomponents | Reduce to provider-agnostic |
| `src/app/curso/[slug]/aula/[lessonId]/page.tsx` | Resolve PlayableSource server-side | getVideoProvider(), getPlayableSource() | Insertion point for provider |
| `src/app/gestor/[institutionSlug]/` | Gestor dashboard views | src/lib/institutions/queries | New route tree |
| `src/app/api/lesson-progress/complete/route.ts` | Returns courseCompleted flag | lesson_progress table | Minor addition |
| `src/lib/certificates/issuer.ts` | Certificate generation, idempotency | admin client (justified: storage + cross-table writes) | No change needed |

---

## Data Flow Direction

```
Browser request
  → middleware.ts (session + role check)
    → /gestor/* guarded by role = gestor_instituicao | admin
    → /admin/* guarded by role = admin (unchanged)
    → /curso/* guarded by authenticated (unchanged)

Lesson page (server)
  → getLessonWithCourseContext(slug, lessonId, supabase, userId)
  → getVideoProvider(lesson.video_provider)
       .getPlayableSource(lesson, user)   ← Bunny token minted here, server-only
  → renders <LessonPlayer source={playableSource} />

LessonPlayer (client)
  → renders iframe/YouTube player using source.embedUrl
  → renders <WatermarkOverlay email={source.watermarkText} />
  → on complete: POST /api/lesson-progress/complete
    ← { courseCompleted: boolean }
  → if courseCompleted: show certificate CTA

Certificate download
  → POST /api/certificates/signed-url { courseId }
  → ensureCourseCertificateIssued (idempotent, admin client)
  → return signed URL (5min)

Gestor dashboard (server)
  → getGestorInstitution(supabase, userId)
  → getInstitutionMembers(supabase, institutionId)   ← RLS enforces gestor scope
  → getMemberProgressSummary(supabase, institutionId) ← RLS enforces gestor scope
  → renders progress/certificate tables
```

---

## Suggested Build Order (Dependency-Aware)

Dependencies flow downward. Each row depends on everything above it in the same column.

```
Phase A (foundation — no parallelism risk):
  1. Migration 0012: institutions + institution_members + enrollments.institution_id
     + RLS policies + helper functions
     + database.types.ts sync
     + src/lib/institutions/ skeleton (types, empty queries)
     RATIONALE: Everything B2B depends on this schema existing.

Phase B (two parallel streams after Phase A):

  Stream B1 (video + watermark):
  2. src/lib/video/ module (types, YouTube provider, Bunny provider, factory)
     + new env vars in env.ts
     RATIONALE: Pure server logic, no UI, testable in isolation.
  3. Refactor LessonPlayer to accept PlayableSource prop
     + lesson page calls getPlayableSource() server-side
     + WatermarkOverlay component
     RATIONALE: Completes the provider integration end-to-end.

  Stream B2 (institution queries + gestor dashboard):
  2. src/lib/institutions/queries.ts (getGestorInstitution, getInstitutionMembers,
     getMemberProgressSummary, getInstitutionCertificates)
     RATIONALE: Pure DB access, testable without UI.
  3. Middleware update: add GESTOR_ROUTES guard
     + src/app/gestor/ route tree + pages
     RATIONALE: Depends on queries and schema. Middleware change is low-risk addition.

Phase C (certificate trigger — depends on Phase A schema, no video dependency):
  4. lesson-progress/complete route: add courseCompleted flag to response
     + LessonPlayer: show certificate CTA when courseCompleted=true
     RATIONALE: Small addition to existing route; depends on schema having enrollment data.
     NOTE: Core certificate issuance (issuer.ts) already works — this is just the trigger UX.

Phase D (migration 0013: video columns):
  5. ALTER TABLE lessons ADD video_provider, video_external_id
     + database.types.ts sync
     + Admin lesson form: add provider/external_id fields
     RATIONALE: This migration is deliberately last in video stream because
     the provider abstraction code can be written and tested with the existing
     video_url before the new columns exist.
```

**Summary order:**
1. Migration 0012 (schema foundation)
2. B1: video provider module + B2: institution queries (parallel)
3. B1: LessonPlayer refactor + watermark + B2: gestor dashboard + middleware (parallel)
4. Certificate CTA on completion
5. Migration 0013 + lesson form video provider fields

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Gestor queries using admin client
**What:** Using `createSupabaseAdminClient()` in gestor dashboard to fetch member progress, bypassing RLS.
**Why bad:** Bypasses the institution-scoping guarantees. A coding mistake could expose another institution's data.
**Instead:** Use server client (cookie-bound). Let RLS policies enforce scoping. RLS is the correct layer for multi-institution isolation.

### Anti-Pattern 2: Bunny token minted client-side
**What:** Moving `getPlayableSource()` to a client component or browser fetch to avoid prop drilling.
**Why bad:** `BUNNY_STREAM_TOKEN_KEY` must never reach the browser. Once in the client bundle or a public API response, anti-piracy is broken.
**Instead:** Always resolve `PlayableSource` in the Server Component (lesson page.tsx) and pass as a serialisable prop to the client.

### Anti-Pattern 3: Token expiry mismatch
**What:** Setting the Bunny embed token expiry to `now + 1 hour` but generating it during server rendering, which may be cached by Next.js.
**Why bad:** If the page is statically cached (it shouldn't be — lesson pages are dynamic), the token expires before the student plays the video.
**Instead:** Ensure lesson pages are `dynamic = 'force-dynamic'` (they already fetch from Supabase with user context, so they are dynamic by default in App Router). Explicitly set `export const dynamic = 'force-dynamic'` in the lesson page.tsx as documentation.

### Anti-Pattern 4: institution_id in JWT claims
**What:** Storing `institution_id` in Supabase JWT `app_metadata` to avoid a join in RLS.
**Why bad:** JWT claims are set at login time and are stale until token refresh. If a user is added to or removed from an institution, the claim is wrong for up to 1 hour. For an admin-managed B2B product, this staleness is unacceptable for the security model.
**Instead:** Use the `is_gestor_of_institution()` helper function approach — it queries `institution_members` live on each policy evaluation, which is accurate and Postgres caches the result per-statement.

### Anti-Pattern 5: unique(user_id, course_id) removal for re-issuance
**What:** Removing the unique constraint from `course_certificates` to allow re-issuance (e.g. name change).
**Why bad:** Removes the idempotency guarantee and the race condition protection that the current issuer depends on.
**Instead:** Keep the constraint. Implement re-issuance as a deliberate delete + re-insert flow, not a "just allow duplicates" relaxation.

---

## Scalability Considerations

| Concern | At 100 students | At 10K students | Notes |
|---------|----------------|----------------|-------|
| RLS helper function cost | Negligible | ~5ms per query | `STABLE` caching amortises over a request |
| Gestor dashboard query | Sub-100ms | May need pagination | `getMemberProgressSummary` does a full scan of `lesson_progress` for the institution. Add `LIMIT`/`OFFSET` from the start |
| PDF generation latency | 2–5s (acceptable) | Same (idempotent, generated once) | Not a scaling concern — first-call only |
| Bunny token generation | Sub-1ms (crypto.createHash) | Same | In-process, no network call |
| institution_members index | Already indexed on user_id | Add composite (institution_id, role) if gestor lookups slow down | |

---

## Sources

- [Bunny Stream Embed Token Authentication](https://docs.bunny.net/docs/stream-embed-token-authentication) — MEDIUM confidence (token algorithm confirmed, dynamic watermark NOT supported via token)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — HIGH confidence (official docs)
- [Supabase RLS helper functions pattern](https://supabase.com/docs/guides/getting-started/ai-prompts/database-rls-policies) — HIGH confidence
- Bunny Stream static watermark is dashboard/encode-time only — confirmed by docs.bunny.net/docs/stream-dashboard-overview (no dynamic per-user text watermark API found)
- Existing codebase: `src/lib/certificates/issuer.ts` — direct code reading, HIGH confidence on idempotency behavior

---

*Architecture research: 2026-04-27*
