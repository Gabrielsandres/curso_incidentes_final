# Phase 4: Video & Anti-Piracy — Research

**Researched:** 2026-04-30
**Domain:** Video provider abstraction, Bunny Stream signed URLs, postMessage event detection, CSS watermark overlay
**Confidence:** HIGH (all critical claims verified via official Bunny docs and player.js spec)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** RSC (`page.tsx`) resolves embed URL server-side via `VideoProvider.getPlayableSource()` and passes as prop to `LessonPlayer`. Zero extra API route on client, loading state eliminated.
- **D-02:** Bunny signed URL TTL: **1 hour** (3600s). Default in code, configurable via `BUNNY_STREAM_TOKEN_TTL_SECONDS` env.
- **D-03:** `BUNNY_STREAM_TOKEN_KEY` never reaches the client — signing happens exclusively in RSC/Server Action.
- **D-04:** Watermark appears **only in production with Bunny provider**. Dev with YouTube: no watermark.
- **D-05:** Watermark position **rotates every 30 seconds** across 4 corners.
- **D-06:** Watermark text: **full student email** (e.g., `fulano@exemplo.com.br`).
- **D-07:** Opacity: **10–15%** (subtle). Resolved as `0.12` inline style.
- **D-08:** Watermark overlay via CSS absolute div with `pointer-events: none`. Does not block player interaction.
- **D-09:** Migration **additive**: keep `video_url` as legacy fallback (nullable), add `video_provider` and `video_external_id`. Already applied in migration 0014.
- **D-10:** Player uses `video_provider` + `video_external_id` when present; falls back to `video_url` if null.
- **D-11:** Admin lesson form (create and edit) gains **select dropdown** + text field for `video_external_id`.
- **D-12:** Bunny video-end detection via **`window.postMessage`** using Player.js protocol: `data.context === 'player.js' && data.event === 'ended'`.
- **D-13:** Manual "Marcar aula como concluída" button **always visible** regardless of provider.
- **D-14:** YouTube maintains auto-completion via `enablejsapi=1` + postMessage (not YouTube IFrame API global). Event: JSON string `{ event: 'infoDelivery', info: { playerState: 0 } }`.

### Claude's Discretion

- Internal structure of `src/lib/video/` (file names, exports) — follow patterns from `src/lib/courses/` and `src/lib/certificates/`.
- Exact CSS implementation of the rotating overlay (CSS variables, keyframes, or `setInterval` JS) — choose simplest approach.
- Bunny embed URL format — confirmed via official docs (see Standard Stack section).

### Deferred Ideas (OUT OF SCOPE)

- Bunny Player.js SDK with custom controls — plain iframe + postMessage is sufficient for v1.
- Full DRM (Widevine/PlayReady) — explicitly out of scope.
- IP-binding in tokens — discarded due to CGNAT incompatibility in Brazil (AP-03).
- Multiple providers beyond YouTube and Bunny — v1 has exactly two.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VID-01 | `VideoProvider` TypeScript interface in `src/lib/video/` with `getPlayableSource(lesson, user) → { provider, embedUrl, watermarkText, ttl }` | Interface design confirmed; follows `src/lib/certificates/` module pattern |
| VID-02 | `youtube-unlisted` adapter resolves from `video_external_id`; restricted to `NODE_ENV !== 'production'`; build fails if YouTube selected in prod | Guard pattern via `getEnv()` + `superRefine` already in `src/lib/env.ts` |
| VID-03 | `bunny-stream` adapter mints signed URL with `SHA256_HEX(key + videoId + expiresUnix)`, TTL via `BUNNY_STREAM_TOKEN_TTL_SECONDS` | Algorithm confirmed via official Bunny docs |
| VID-04 | Token signing happens only on server (RSC or Server Action); Bunny key never serialized to client | D-01 + RSC pattern already established in `page.tsx` |
| VID-05 | Lessons have `video_provider` and `video_external_id` columns; admin form uses provider selector | Columns exist in DB (migration 0014 already applied); admin forms partially built |
| AP-01 | Player shows CSS overlay with student email at low opacity; `pointer-events: none`; documented as deterrence | WatermarkOverlay component pattern specified in UI-SPEC |
| AP-02 | Bunny signed URLs have TTL ≤ 4h; re-minted on every page load | D-02 sets 1h default; re-mint on RSC load satisfies requirement |
| AP-03 | Player does NOT use IP-binding (incompatible with Brazilian CGNAT) | No IP included in SHA256 formula — confirmed by Bunny docs |
| AP-04 | `docs/` documents realistic protection ceiling (overlay is deterrence, screen recording possible) | New `docs/anti-piracy.md` file required |
</phase_requirements>

---

## Summary

Phase 4 refactors the lesson player to support two video providers (YouTube for dev, Bunny Stream for prod) through a clean TypeScript interface, performs server-side token signing for Bunny, and adds a CSS watermark overlay showing the student's email. No new npm packages are needed — the implementation relies on the Node.js built-in `crypto` module for SHA256, native browser `window.postMessage` for event detection, and plain CSS/React for the overlay.

The critical spike from STATE.md is resolved: the Bunny Player uses the **Player.js open standard**, meaning the exact postMessage message format is `{ context: 'player.js', event: 'ended' }`. The listener must filter on `data.context === 'player.js' && data.event === 'ended'` — not the simpler `data.event === 'ended'` that was noted as MEDIUM confidence in the previous state.

The database schema for this phase is **already applied** (migration 0014 added `video_provider`, `video_external_id`, and dropped `NOT NULL` on `video_url`). The `database.types.ts` already reflects these columns. The `updateLessonAction` already saves `video_provider` and `video_external_id`. The edit form already has the provider selector UI. This means Phase 4's implementation scope is narrower than it might appear: the planner should audit what's already done before creating tasks.

**Primary recommendation:** Build `src/lib/video/` as a pure server-side module with `VideoProvider` interface, two adapters, and the signing logic. Then refactor `LessonPlayer` to accept pre-resolved `embedUrl`/`provider`/`watermarkText` props instead of the raw lesson object. Finally add the `WatermarkOverlay` sub-component and postMessage listeners.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token signing (Bunny SHA256) | API / Backend (RSC) | — | Key must never touch client bundle (D-03, VID-04) |
| Provider selection (youtube vs bunny) | API / Backend (RSC) | — | NODE_ENV check belongs server-side; client never branches on this |
| Embed URL resolution | API / Backend (RSC) | — | `getPlayableSource()` called in `page.tsx` RSC (D-01) |
| Watermark text resolution | API / Backend (RSC) | — | Student email comes from authenticated session in RSC |
| Watermark overlay rendering | Browser / Client | — | CSS position + React state for corner rotation |
| Video end detection (postMessage) | Browser / Client | — | `window.addEventListener('message')` must be in Client Component |
| Manual lesson completion | Browser / Client → API/Backend | API route | Client calls `/api/lesson-progress/complete` (unchanged) |
| Admin provider selector UI | Browser / Client | — | Controlled state for conditional hint text |
| Lesson insert with `video_provider` | API / Backend (Server Action) | — | `createLessonAction` needs extension for new fields |

---

## Standard Stack

### Core (no new packages)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` | built-in (Node 22) | SHA256 for Bunny token signing | Available in RSC; no install needed |
| React | 19.2.3 | `useState`, `useEffect` for watermark rotation and postMessage listener | Already in project |
| Next.js App Router | 16.0.10 | RSC `page.tsx` runs server-side for token signing | Already in project |
| Zod | 3.24.1 | Validate `BUNNY_STREAM_TOKEN_TTL_SECONDS` env var | Already in `env.ts` |
| Vitest | 4.0.4 | Unit tests for signing logic and provider adapters | Already configured |

**Version verification:** All packages are already installed — no `npm install` step needed for this phase. [VERIFIED: package.json]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:crypto` SHA256 | Bunny SDK | No SDK exists for token signing; `crypto` is the correct approach |
| Plain iframe + postMessage | Bunny Player.js SDK (npm) | SDK deferred — adds dependency without meaningful benefit for v1 |
| `setInterval` JS rotation | CSS `@keyframes` animation | `setInterval` gives React state control; simpler to conditionally pause |

**Installation:** No new packages needed.

---

## Architecture Patterns

### System Architecture Diagram

```
Request: GET /curso/[slug]/aula/[lessonId]
          |
          v
    [ RSC page.tsx ]
          |
          +-- getLessonWithCourseContext()  →  Supabase (lessons + materials)
          |     returns: lesson.video_provider, lesson.video_external_id, lesson.video_url
          |
          +-- VideoProvider.getPlayableSource(lesson, user)  [server-only]
          |     |
          |     +--> if video_provider === 'bunny':
          |     |        BunnyStreamAdapter.getPlayableSource()
          |     |        SHA256_HEX(key + videoId + expiresUnix)
          |     |        returns { provider: 'bunny', embedUrl: 'https://iframe.mediadelivery.net/...', watermarkText: user.email, ttl: 3600 }
          |     |
          |     +--> if video_provider === 'youtube':
          |     |        YouTubeUnlistedAdapter.getPlayableSource()
          |     |        guard: NODE_ENV === 'production' → throw Error (VID-02)
          |     |        returns { provider: 'youtube', embedUrl: 'https://youtube.com/embed/...?enablejsapi=1&rel=0', watermarkText: null, ttl: null }
          |     |
          |     +--> fallback (video_provider null, video_url set):
          |              legacy path: build YouTube embed from video_url
          |              returns { provider: 'youtube', embedUrl: ..., watermarkText: null, ttl: null }
          |
          v
    Props passed down: { embedUrl, provider, watermarkText, lessonId, lessonTitle, lessonDescription, initialIsCompleted }
          |
          v
    [ LessonPlayer (Client Component) ]
          |
          +-- <iframe src={embedUrl} />   ← video frame
          |
          +-- <WatermarkOverlay text={watermarkText} />  ← if watermarkText !== null
          |     useState corner [0-3], setInterval 30s rotation
          |     absolute positioned, pointer-events: none, aria-hidden
          |
          +-- useEffect: window.addEventListener('message')
          |     Bunny: data.context === 'player.js' && data.event === 'ended'
          |     YouTube: JSON.parse(data).event === 'infoDelivery' && info.playerState === 0
          |     → markLessonAsCompleted('video-end')
          |
          +-- Manual button: markLessonAsCompleted('manual')
          |     → POST /api/lesson-progress/complete  (unchanged)
```

### Recommended Project Structure

```
src/lib/video/
├── index.ts             # Public exports: VideoProvider interface + getPlayableSource factory
├── types.ts             # VideoProvider interface, PlayableSource type, VideoProviderName enum
├── bunny-adapter.ts     # BunnyStreamAdapter — SHA256 signing, embed URL construction
├── youtube-adapter.ts   # YouTubeUnlistedAdapter — embed URL builder, prod guard
└── video.test.ts        # Unit tests for signing logic and fallback behavior
```

This follows the `src/lib/certificates/` pattern exactly (2-4 files, no index barrel confusion, types co-located).

### Pattern 1: VideoProvider Interface

**What:** TypeScript interface ensuring both adapters return the same shape.
**When to use:** Called from RSC `page.tsx` — adapter selection based on `lesson.video_provider`.

```typescript
// Source: VID-01 requirement + D-01 decision
export type VideoProviderName = "youtube" | "bunny";

export type PlayableSource = {
  provider: VideoProviderName;
  embedUrl: string;
  watermarkText: string | null;  // null = no watermark (YouTube dev mode)
  ttl: number | null;            // seconds; null for YouTube (no expiry)
};

export interface VideoProvider {
  getPlayableSource(
    lesson: { video_external_id: string | null; video_url: string | null },
    user: { email: string }
  ): Promise<PlayableSource> | PlayableSource;
}
```

### Pattern 2: Bunny Signed URL Generation

**What:** SHA256 hex token from `key + videoId + expiresUnix`.
**When to use:** BunnyStreamAdapter.getPlayableSource() — server-only.

```typescript
// Source: https://docs.bunny.net/docs/stream-embed-token-authentication
// Verified: SHA256_HEX(tokenKey + videoId + expiresUnix) — NOT HMAC, NOT base64
import { createHash } from "node:crypto";

function signBunnyToken(tokenKey: string, videoId: string, expiresUnix: number): string {
  return createHash("sha256")
    .update(tokenKey + videoId + String(expiresUnix))
    .digest("hex");
}

// Embed URL format (verified via official docs):
// https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={token}&expires={expiresUnix}
function buildBunnyEmbedUrl(libraryId: string, videoId: string, token: string, expires: number): string {
  const params = new URLSearchParams({ token, expires: String(expires) });
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}
```

**Key detail about `libraryId`:** Bunny Stream organizes videos inside "libraries". The library ID is numeric and found in the Bunny dashboard. It is required for the embed URL. The env var should be `BUNNY_STREAM_LIBRARY_ID` (number, required in prod). [CITED: docs.bunny.net/docs/stream-embed-token-authentication]

### Pattern 3: postMessage Event Detection

**What:** Listening to video-end events from both providers without external SDKs.

```typescript
// Source: https://github.com/embedly/player.js/blob/master/SPEC.rst (Player.js spec)
// Bunny uses Player.js protocol — message format: { context: 'player.js', event: 'ended' }
// YouTube uses its own format when enablejsapi=1: JSON string { event: 'infoDelivery', info: { playerState: 0 } }

useEffect(() => {
  function handleMessage(event: MessageEvent) {
    // Bunny Stream: Player.js protocol
    if (
      typeof event.data === "object" &&
      event.data !== null &&
      event.data.context === "player.js" &&
      event.data.event === "ended"
    ) {
      void markLessonAsCompleted("video-end");
      return;
    }

    // YouTube: infoDelivery with playerState 0 (ENDED)
    if (typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data) as { event?: string; info?: { playerState?: number } };
        if (parsed.event === "infoDelivery" && parsed.info?.playerState === 0) {
          void markLessonAsCompleted("video-end");
        }
      } catch {
        // not a JSON message — ignore
      }
    }
  }

  window.addEventListener("message", handleMessage);
  return () => window.removeEventListener("message", handleMessage);
}, [markLessonAsCompleted]);
```

**Note on origin filtering:** The Player.js spec uses `data.context === 'player.js'` as the discriminator — no origin check needed since both providers will have correct context. The YouTube branch is safe because it only triggers on `infoDelivery` + `playerState === 0`, a pattern unique to YouTube embeds.

### Pattern 4: Production Guard (VID-02)

**What:** YouTubeUnlistedAdapter throws at build/runtime if used in production.

```typescript
// Source: VID-02 requirement — "build fails if YouTube selected in prod"
// Note: a runtime throw in RSC will surface as a 500 during SSR, not an actual build failure.
// The requirement means: no YouTube video should be playable in production.
function assertNotProduction() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "YouTubeUnlistedAdapter cannot be used in production. " +
      "Change video_provider to 'bunny' before deploying."
    );
  }
}
```

This throw in the RSC will cause a 500 error on the lesson page if a lesson with `video_provider = 'youtube'` is loaded in production — which is the intended behavior.

### Pattern 5: LessonPlayer Props Refactor

**What:** LessonPlayer receives pre-resolved data instead of raw lesson object.

```typescript
// Source: D-01 + UI-SPEC component inventory
type LessonPlayerProps = {
  embedUrl: string;
  provider: "youtube" | "bunny";
  watermarkText: string | null;
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string | null;
  initialIsCompleted: boolean;
};
```

The YouTube IFrame API global (`window.YT`, `loadYouTubeIframeApi`, `onYouTubeIframeAPIReady`) is removed entirely from `lesson-player.tsx`.

### Pattern 6: Environment Variable Extension

**What:** Three new env vars added to `serverSchema` in `src/lib/env.ts`.

```typescript
// Add to serverSchema.extend():
BUNNY_STREAM_TOKEN_KEY: z.string().optional().superRefine((v, ctx) => {
  if (process.env.NODE_ENV === "production" && !v) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "BUNNY_STREAM_TOKEN_KEY is required in production." });
  }
}),
BUNNY_STREAM_LIBRARY_ID: z.string().optional().superRefine((v, ctx) => {
  if (process.env.NODE_ENV === "production" && !v) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "BUNNY_STREAM_LIBRARY_ID is required in production." });
  }
}),
BUNNY_STREAM_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
```

`BUNNY_STREAM_LIBRARY_ID` stores the numeric library ID from the Bunny dashboard (e.g., `"123456"`). The `token_key` comes from the library settings → API/Token Authentication section.

### Anti-Patterns to Avoid

- **Don't use HMAC-SHA256 for Bunny embed tokens.** The Stream embed token uses a simple SHA256 hash (not HMAC). HMAC is used in Bunny's CDN token authentication — different product. [VERIFIED: docs.bunny.net/docs/stream-embed-token-authentication]
- **Don't base64-encode the Bunny token.** The embed token must be hex (`.digest("hex")`), not base64. The CDN token uses base64 — do not mix these up.
- **Don't filter postMessage events by `event.origin`** for the Bunny Player.js events — use `data.context === 'player.js'` as the protocol discriminator instead.
- **Don't call `getPlayableSource()` in a Client Component.** The token key must remain server-only (D-03).
- **Don't add `youtube` to the provider select in production.** The edit form already guards this with `{!isProduction && <option value="youtube">...}`. The create form (`add-lesson-form.tsx`) needs the same guard — it does not have it yet.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SHA256 hashing | Custom hash implementation | `node:crypto` built-in | 100% correct, zero dependencies, available in RSC |
| Video end detection | Polling `currentTime` | `window.postMessage` (Player.js for Bunny, `infoDelivery` for YT) | Official protocol; polling is fragile and wastes CPU |
| Watermark positioning | CSS `transform: translate()` calculations | Tailwind utility classes (`top-3 left-3`, etc.) | Already specified in UI-SPEC; no calculation needed |
| URL building | Manual string concatenation for embed URL | `URLSearchParams` + template literals | Handles encoding of special characters in token |

---

## Common Pitfalls

### Pitfall 1: Wrong Hash Algorithm for Bunny Token

**What goes wrong:** Using HMAC-SHA256 (from CDN token auth docs) instead of plain SHA256 for Stream embed token.
**Why it happens:** Bunny has two token systems — CDN tokens (HMAC) and Stream embed tokens (plain SHA256). Documentation pages look similar.
**How to avoid:** Use `createHash('sha256').update(key + videoId + expires).digest('hex')` — no `createHmac`.
**Warning signs:** Token accepted but video doesn't play; "Invalid token" error from Bunny.

### Pitfall 2: Missing `libraryId` in Embed URL

**What goes wrong:** Building embed URL as `iframe.mediadelivery.net/embed/{videoId}` instead of `iframe.mediadelivery.net/embed/{libraryId}/{videoId}`.
**Why it happens:** UI-SPEC references `BUNNY_STREAM_CDN_ZONE` but the official docs use `libraryId` (numeric). These are different concepts.
**How to avoid:** Embed URL format is: `https://iframe.mediadelivery.net/embed/{BUNNY_STREAM_LIBRARY_ID}/{video_external_id}?token=...&expires=...`
**Warning signs:** 404 response on embed URL.

### Pitfall 3: Bunny postMessage — Wrong Event Format

**What goes wrong:** Listening for `event.data.event === 'ended'` without checking `event.data.context === 'player.js'`.
**Why it happens:** The CONTEXT.md blocker was MEDIUM confidence on this exact point.
**How to avoid (RESOLVED):** Bunny embeds the Player.js library. The correct filter is `data.context === 'player.js' && data.event === 'ended'`. Confirmed via [Player.js SPEC](https://github.com/embedly/player.js/blob/master/SPEC.rst). [VERIFIED: player.js spec]
**Warning signs:** Auto-completion triggers on wrong messages or never triggers.

### Pitfall 4: YouTube postMessage — JSON parse on non-string data

**What goes wrong:** Calling `JSON.parse(event.data)` when `event.data` is already an object (from Bunny Player.js events), causing a runtime error.
**Why it happens:** Both providers fire postMessage events; YouTube events arrive as JSON strings while Bunny events arrive as plain objects.
**How to avoid:** Guard with `typeof event.data === 'string'` before `JSON.parse`. Guard Bunny branch with `typeof event.data === 'object'`.
**Warning signs:** `SyntaxError: JSON.parse` in browser console during lesson playback.

### Pitfall 5: `getLessonWithCourseContext` Does Not Fetch `video_provider`/`video_external_id`

**What goes wrong:** The RSC `page.tsx` can't call `getPlayableSource()` if the lesson query doesn't return the new columns.
**Why it happens:** The current `getLessonWithCourseContext` query selects `video_url` but does NOT select `video_provider` or `video_external_id`. [VERIFIED: queries.ts line 375]
**How to avoid:** The query in `getLessonWithCourseContext` must be updated to also select `video_provider, video_external_id`.
**Warning signs:** TypeScript error — `video_provider` not present on `lesson` object passed to `getPlayableSource()`.

### Pitfall 6: `createLessonAction` Still Inserts `video_url` (Legacy)

**What goes wrong:** New lessons created via the module page still insert `video_url` from a form field that no longer exists in `add-lesson-form.tsx` after Phase 4.
**Why it happens:** `createLessonAction` validates `videoUrl: z.string().url()` in `createLessonSchema` and writes `video_url` to the DB. After Phase 4 the create form sends `video_provider` + `video_external_id` instead.
**How to avoid:** Update `createLessonSchema` to accept `videoProvider` + `videoExternalId` (both optional, consistent with edit form), and update `createLessonAction` to write these columns (not `video_url`). [VERIFIED: create-lesson.ts + schema.ts]
**Warning signs:** Lesson creation fails with Zod validation error on `videoUrl`.

### Pitfall 7: Watermark `bottom-12` May Clip on Mobile

**What goes wrong:** Bunny player controls height may differ on mobile, making `bottom-12` (48px) insufficient padding.
**Why it happens:** `bottom-12` is an estimate based on typical desktop Bunny player controls height (UI-SPEC notes this).
**How to avoid:** Treat as acceptable for v1 — deterrence watermark at approximate position. Claude's discretion: use `bottom-12` as specified in UI-SPEC.
**Warning signs:** Watermark overlaps Bunny player controls on narrow viewports.

---

## Code Examples

### SHA256 Hex — Verified Bunny Token Format

```typescript
// Source: https://docs.bunny.net/docs/stream-embed-token-authentication
import { createHash } from "node:crypto";

const expiresUnix = Math.floor(Date.now() / 1000) + 3600; // 1 hour
const token = createHash("sha256")
  .update(tokenKey + videoId + String(expiresUnix))
  .digest("hex");

const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expiresUnix}`;
```

### YouTube Embed URL with enablejsapi

```typescript
// Source: https://developers.google.com/youtube/iframe_api_reference
// enablejsapi=1 required for postMessage events; rel=0 suppresses related videos
const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0`;
```

### WatermarkOverlay Component (from UI-SPEC)

```typescript
// Source: 04-UI-SPEC.md — Component Inventory section
function WatermarkOverlay({ text }: { text: string }) {
  const [corner, setCorner] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCorner((c) => ((c + 1) % 4) as 0 | 1 | 2 | 3);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const positionClass = [
    "top-3 left-3",
    "top-3 right-3",
    "bottom-12 right-3",
    "bottom-12 left-3",
  ][corner];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute ${positionClass} select-none text-sm font-semibold text-white transition-opacity duration-500`}
      style={{ opacity: 0.12 }}
    >
      {text}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| YouTube IFrame API JS (`window.YT`) | postMessage without global API | Phase 4 plan | Removes script injection, no global pollution |
| `video_url` direct URL in lesson | `video_provider` + `video_external_id` columns | Migration 0014 (already applied) | Provider-agnostic storage |
| Hardcoded YouTube in `lesson-player.tsx` | `VideoProvider` interface with adapters | Phase 4 | Clean extensibility if more providers needed |
| No watermark | CSS overlay with rotating email | Phase 4 | Deterrence without DRM cost |

**Pre-existing Phase 4 work (already done — do not recreate):**
- Migration 0014: `video_provider`, `video_external_id` columns exist in DB. [VERIFIED: 0014_catalog_metadata.sql]
- `database.types.ts`: already includes `video_provider` and `video_external_id` in `lessons` Row/Insert/Update. [VERIFIED: database.types.ts lines 109-111]
- `updateLessonSchema`: already has `videoProvider` and `videoExternalId` fields. [VERIFIED: lessons/schema.ts lines 125-127]
- `updateLessonAction`: already writes `video_provider` and `video_external_id` to DB. [VERIFIED: update-lesson.ts lines 70-72]
- `lesson-edit-form.tsx`: already has the provider select + `video_external_id` input UI. [VERIFIED: lesson-edit-form.tsx lines 100-137]
- `getAdminLessonWithContext` and `getAdminModuleWithLessons`: already select `video_provider, video_external_id`. [VERIFIED: queries.ts lines 612, 572]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bunny player controls height is ~48px (bottom-12 = 48px clears controls) | Common Pitfalls #7 | Watermark overlaps controls on some viewports — cosmetic only |
| A2 | `BUNNY_STREAM_LIBRARY_ID` is the correct env var name for the library identifier | Standard Stack | Planner names it differently; minor rename |
| A3 | YouTube `infoDelivery` + `playerState: 0` approach works for unlisted videos embedded with `enablejsapi=1` | Code Examples | YouTube auto-completion fails; student uses manual button (D-13 mitigates) |

**The critical blocker from STATE.md is resolved:** Bunny Player postMessage event name is `'ended'` with `context: 'player.js'` — confidence upgraded from MEDIUM to HIGH. [VERIFIED: Player.js spec at github.com/embedly/player.js/blob/master/SPEC.rst]

---

## Open Questions

1. **Bunny Library ID vs CDN Zone terminology**
   - What we know: Official embed docs use `library_id` (numeric). STATE.md blocker mentions `BUNNY_STREAM_CDN_ZONE` as a format to verify.
   - What's unclear: Whether the user's Bunny account uses "library ID" numbering or a "zone" concept.
   - Recommendation: Name the env var `BUNNY_STREAM_LIBRARY_ID` (matches official docs). If the Bunny dashboard shows "CDN Zone" instead, they map to the same concept — planner should note this in documentation for the admin operator.

2. **`add-lesson-form.tsx` does not pass `isProduction` prop**
   - What we know: The create form (`add-lesson-form.tsx`) lacks the `isProduction` prop and lacks the video provider section entirely. The module page RSC (`modulos/[moduleId]/page.tsx`) needs to pass `process.env.NODE_ENV === "production"` to the form.
   - Recommendation: This is a required task. Both "add video section to create form" and "wire isProduction prop from page RSC" must be in the plan.

3. **`createLessonSchema` migration**
   - What we know: `createLessonSchema` currently requires `videoUrl` (`.url()` validation). After Phase 4, the create form sends `video_provider` + `video_external_id` instead.
   - Recommendation: Update schema to make `videoUrl` optional + add `videoProvider`/`videoExternalId` fields. The action must write the new columns, not `video_url`. This is a breaking change to the create-lesson flow.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `node:crypto` | Bunny SHA256 signing | Yes | Node 22 built-in | None needed |
| Next.js RSC | Server-side token signing | Yes | 16.0.10 | — |
| Supabase (Postgres) | `video_provider`/`video_external_id` columns | Yes | Migration 0014 applied | — |
| Bunny Stream account | Production video serving | Not verifiable locally | — | YouTube in dev |

**Missing dependencies with no fallback:** None that block local development.

**Missing dependencies with fallback:** Bunny Stream credentials (`BUNNY_STREAM_TOKEN_KEY`, `BUNNY_STREAM_LIBRARY_ID`) — not needed locally; YouTube adapter handles dev environment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/video/video.test.ts` |
| Full suite command | `npm run test:ci` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VID-01 | `VideoProvider` interface — `getPlayableSource` returns correct shape | unit | `npx vitest run src/lib/video/video.test.ts` | No — Wave 0 |
| VID-02 | YouTube adapter throws in production (`NODE_ENV === production`) | unit | `npx vitest run src/lib/video/video.test.ts` | No — Wave 0 |
| VID-03 | Bunny adapter produces correct SHA256 hex token | unit | `npx vitest run src/lib/video/video.test.ts` | No — Wave 0 |
| VID-03 | Bunny adapter includes `expires` within TTL window | unit | `npx vitest run src/lib/video/video.test.ts` | No — Wave 0 |
| VID-04 | Server-side only — structural (RSC import) | manual | lint + typecheck | — |
| VID-05 | Admin form saves `video_provider` + `video_external_id` | manual | Local dev smoke test | — |
| AP-01 | Watermark renders when `watermarkText !== null` | manual | Local dev smoke test | — |
| AP-02 | TTL ≤ 4h — assertion on `expiresUnix` calculation | unit | `npx vitest run src/lib/video/video.test.ts` | No — Wave 0 |
| AP-03 | No IP in token — code inspection | manual | Code review | — |
| AP-04 | `docs/anti-piracy.md` exists | manual | File exists check | — |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/video/video.test.ts`
- **Per wave merge:** `npm run test:ci && npm run typecheck && npm run lint`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/lib/video/video.test.ts` — covers VID-01 (interface shape), VID-02 (prod guard), VID-03 (SHA256 correctness + TTL), AP-02 (TTL ≤ 4h assertion)
- [ ] `docs/anti-piracy.md` — AP-04 documentation

*(Existing test infrastructure covers all other requirements via manual smoke testing)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | — |
| V3 Session Management | No | — |
| V4 Access Control | Partial | Lesson access already gated by enrollment RLS in Supabase; video URL being server-side prevents direct URL construction |
| V5 Input Validation | Yes | `video_external_id` validated via Zod in both `updateLessonSchema` and new create schema |
| V6 Cryptography | Yes | Node.js `crypto` built-in — never hand-rolled |

### Known Threat Patterns for Video Embedding Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token exfiltration via client bundle | Information Disclosure | `BUNNY_STREAM_TOKEN_KEY` in `serverSchema` only; never in `clientSchema` |
| Token replay attack (stolen token reuse) | Elevation of Privilege | Short TTL (1h) limits window; AP-02 requirement |
| Watermark bypass (CSS disable) | Spoofing | Documented as deterrence ceiling (AP-04); `select-none` reduces trivial copy |
| YouTube in production | Information Disclosure | Prod guard throws in RSC; admin form hides YouTube option in prod |
| CGNAT shared IP ban (if IP-binding used) | Denial of Service | No IP-binding per AP-03; `video_external_id` Zod validation prevents injection |

---

## Sources

### Primary (HIGH confidence)

- [Bunny Stream Embed Token Authentication](https://docs.bunny.net/docs/stream-embed-token-authentication) — SHA256_HEX formula, embed URL format, library_id parameter
- [Bunny Stream Playback Control API](https://docs.bunny.net/docs/playback-control-api) — Player.js event names (`ended`, `play`, `pause`)
- [Player.js SPEC](https://github.com/embedly/player.js/blob/master/SPEC.rst) — postMessage message format: `{ context: 'player.js', event: 'ended' }` — resolves STATE.md spike blocker
- Codebase: `src/lib/database.types.ts` — `video_provider`, `video_external_id` already in schema
- Codebase: `supabase/migrations/0014_catalog_metadata.sql` — migration already applied
- Codebase: `src/lib/lessons/schema.ts` — `updateLessonSchema` already handles new columns
- Codebase: `src/app/actions/update-lesson.ts` — already writes `video_provider`, `video_external_id`
- Codebase: `src/app/admin/cursos/[slug]/aulas/[lessonId]/lesson-edit-form.tsx` — provider selector UI already built

### Secondary (MEDIUM confidence)

- [YouTube iframe postMessage format](https://medium.com/@mihauco/youtube-iframe-api-without-youtube-iframe-api-f0ac5fcf7c74) — `infoDelivery` + `playerState: 0` pattern for ENDED without YT API SDK
- [Bunny Stream Player.js announcement](https://bunny.net/blog/introducing-player-js-support-for-bunny-stream-advanced-player-control-and-monitoring-api/) — confirms Player.js as official integration method

### Tertiary (LOW confidence)

- None — all critical claims verified via official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries already installed
- Bunny signing algorithm: HIGH — verified via official docs
- Player.js postMessage format: HIGH — verified via Player.js spec (resolves STATE.md MEDIUM blocker)
- YouTube postMessage format: MEDIUM — confirmed via community articles cross-referenced with YouTube API docs
- Architecture patterns: HIGH — follow established codebase conventions

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable APIs — Bunny Stream and Player.js spec are stable)
