# Phase 3: Progress & Certificates — Research

**Researched:** 2026-04-30
**Domain:** Next.js App Router brownfield delta — progress queries, API response shape, client state, admin form wiring
**Confidence:** HIGH (all findings verified against actual source files in this session)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Banner inline (not toast, not redirect) inside LessonPlayer, below completion button area but ABOVE the button row. Green emerald styling. Link to `/dashboard`. No auto-dismiss.
- **D-02:** `isCourseCompleted` flag added to `/api/lesson-progress/complete` response. Route already calls `ensureCourseCertificateIssued` and knows the result. Flag is `true` when result is `"issued"` or `"already_issued"` AND the course was fully complete (0 remaining lessons). Player sets `showCompletionBanner(true)` on this flag.
- **D-03:** Banner is local state `showCompletionBanner: boolean` inside LessonPlayer. Never auto-dismissed.
- **D-04:** "Continuar de onde parei" button ONLY on `/dashboard` course cards. Not on `/curso/[slug]`.
- **D-05:** `nextLessonId` computed inside `getAvailableCourses`. Ordering: `(module.position ASC, lesson.position ASC)`, ignoring `deleted_at IS NOT NULL`. Type `CourseSummary` gains `nextLessonId: string | null`.
- **D-06:** Dashboard card button states: (A) no progress → "Entrar no curso"; (B) partial → "Continuar de onde parei" (primary) + "Ver curso" (secondary); (C) 100% + cert enabled → "Meus Certificados" (primary) + "Rever curso" (secondary); (C) 100% + cert disabled → "Rever curso" only.
- **D-07:** Certificate config section added to `/admin/cursos/[slug]` page (via `course-edit-form.tsx`). No new page/route.
- **D-08:** Fields always visible: `certificate_enabled` toggle + explanatory text. Fields hidden when `certificate_enabled = false`: template URL, workload hours, signer name, signer role. Use `className="hidden"` (display:none) not CSS opacity trick — accessibility requirement from UI-SPEC.
- **D-09:** Certificate section saves via the existing `updateCourseAction` (same "Salvar rascunho" button). No separate save button. Schema already supports all fields.
- **D-10:** `ensureCourseCertificateIssued` already_issued idempotency covers CERT-05. Just document in issuer tests.
- **D-11:** NO new SQL migrations. All columns exist.
- **D-12:** `getAvailableCourses` must filter `deleted_at IS NOT NULL` lessons when counting progress denominator (parity with `getCourseWithContent`).

### Claude's Discretion

None in CONTEXT.md — all implementation choices were locked by the discuss phase.

### Deferred Ideas (OUT OF SCOPE)

- Admin UI for listing certificates issued per student
- Certificate PDF preview in admin
- Certificate revocation
- CSV progress report per course
- Email notification on certificate issuance
- Pagination in MyCertificates
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROG-01 | Dashboard lists courses with % completion | Already implemented; `getAvailableCourses` returns `completionPercentage`. Dashboard renders it. No new code needed. |
| PROG-02 | "Continuar de onde parei" button to last incomplete lesson | `nextLessonId` field addition to `getAvailableCourses` + `CourseSummary` type + dashboard card state logic |
| PROG-03 | Lesson marked complete via API, persists across reload | Already implemented (`/api/lesson-progress/complete` + `lesson_progress` upsert). No new code. |
| PROG-04 | Banner shown when 100% complete without page reload | `isCourseCompleted` flag in API response + `showCompletionBanner` local state in `LessonPlayer` |
| CERT-01 | Idempotent certificate row on 100% completion | Already implemented (`ensureCourseCertificateIssued` + UNIQUE constraint). No new code. |
| CERT-02 | PDF generated lazy on first download, stored in Storage | Already implemented (`buildCourseCertificatePdf` + Storage upload). No new code. |
| CERT-03 | PDF has correct glyphs, date, UUID, logo | Already implemented (`pdf.ts`). Admin UI for cert config fields is the delta in this phase. |
| CERT-04 | Student downloads certificate via signed URL | Already implemented (`/api/certificates/signed-url` + `MyCertificates` component). No new code. |
| CERT-05 | Adding lessons doesn't invalidate existing certificate | Already implemented (`already_issued` check in issuer). Document in tests. |
</phase_requirements>

---

## Summary

Phase 3 is primarily a UI delta and minor API extension phase, not a from-scratch build. The certificate issuance pipeline (`issuer.ts`, `pdf.ts`, signed-URL route, `MyCertificates` component), the progress tracking API route, and the dashboard progress display are all fully operational. What remains to build is narrow and well-contained in three areas.

**Area 1 (PROG-02 + PROG-04 data):** Extend `getAvailableCourses` to compute `nextLessonId` — the first incomplete lesson in `(module.position ASC, lesson.position ASC)` order, skipping soft-deleted lessons. This is a TypeScript-only change in `queries.ts`; the Supabase query already fetches lesson IDs (though without `position` or module position — those fields must be added to the select). The `CourseSummary` type in `types.ts` gains `nextLessonId: string | null`.

**Area 2 (PROG-04 UI + API):** Add `isCourseCompleted: boolean` to the `/api/lesson-progress/complete` response. The route's `issueCertificateBestEffort` function currently discards the return value; it must be changed to return it so the route can inspect the status. The issuer returns `"issued"` on first issuance and `"already_issued"` on repeat — both indicate the course was fully complete; the distinction is whether this is a new certificate. Both values should set `isCourseCompleted: true` in the response (a student re-completing a lesson on an already-100%-complete course should still see the banner). In `LessonPlayer`, add `showCompletionBanner` state initialized to `false`, set to `true` on `response.ok && data.isCourseCompleted === true`.

**Area 3 (CERT-03 admin UI):** The `course-edit-form.tsx` already renders all five certificate fields (lines 162–228). The only delta is: (a) add a controlled `certificateEnabled` React state initialized from `course.certificate_enabled`, (b) wrap the four dependent fields in a `className={certificateEnabled ? "" : "hidden"}` container, and (c) make the checkbox toggle call `setCertificateEnabled`. The form already saves all fields through `updateCourseAction`. The explanatory paragraph and updated hint texts are also new. No schema changes needed.

**Primary recommendation:** Implement in four plans: (1) queries extension — `nextLessonId` + `deleted_at` filter; (2) API route — `isCourseCompleted` flag + `issueCertificateBestEffort` refactor; (3) dashboard UI — card button state logic; (4) lesson player banner + admin cert form conditional visibility. Tests accompany each plan.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Next lesson computation | API / Backend (server query) | — | Requires DB access; computed in `getAvailableCourses` (RSC data fetch) |
| Progress % display | Browser / Client (RSC renders) | — | RSC renders data returned by query; no client state needed |
| "Continuar de onde parei" CTA | Browser / Client | — | Dashboard is RSC; `Link` href built from `nextLessonId` from query |
| Course completion detection | API / Backend (route handler) | — | `/api/lesson-progress/complete` already calls issuer; issuer knows eligibility |
| Completion banner display | Browser / Client | — | `LessonPlayer` is `"use client"`; local state `showCompletionBanner` |
| Certificate config save | API / Backend (Server Action) | — | `updateCourseAction` is a Server Action; Zod validates, Supabase persists |
| Cert field conditional visibility | Browser / Client | — | Controlled `certificateEnabled` state in `CourseEditForm` (`"use client"`) |

---

## Standard Stack

No new packages. Phase 3 uses only what is already installed.

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16 | App Router, RSC, Server Actions, API routes | Already installed |
| React | 19 | `useState`, `useCallback`, `useActionState` | Already installed |
| TypeScript | strict | Type annotations for new fields | Already installed |
| Supabase JS | (existing) | DB queries in `queries.ts` | Already installed |
| Zod | (existing) | Schema validation (no new schemas needed) | Already installed |
| Tailwind v4 | (existing) | Styling — no new classes beyond existing tokens | Already installed |
| lucide-react | (existing) | Icons (no new icons needed in Phase 3) | Already installed |

[VERIFIED: codebase scan — package.json, no new install needed]

---

## Architecture Patterns

### System Architecture Diagram

```
Student marks lesson complete
        │
        ▼
POST /api/lesson-progress/complete
        │
        ├─► upsert lesson_progress (server client or admin fallback)
        │
        └─► issueCertificateBestEffort(userId, courseId)
                │
                ├─► ensureCourseCertificateIssued(...)
                │       ├─ already_issued → return "already_issued"
                │       ├─ not_eligible   → return "not_eligible"
                │       └─ issued         → return "issued"
                │
                └─► result.status ∈ {"issued","already_issued"}?
                        │
                        YES → JSON { ok: true, isCourseCompleted: true }
                        NO  → JSON { ok: true, isCourseCompleted: false }

LessonPlayer (client)
        │
        ├─ receives { ok, isCourseCompleted }
        └─ isCourseCompleted === true → setShowCompletionBanner(true)
                                            │
                                            └─ renders banner above button row


Dashboard RSC data flow
        │
        ▼
getAvailableCourses(supabase, userId)
        │
        ├─ SELECT courses + modules(id, position, lessons(id, position, deleted_at))
        │   WHERE published_at IS NOT NULL AND archived_at IS NULL
        │
        ├─ filter lessons: deleted_at IS NULL
        │
        ├─ getLessonProgressByLessonId(supabase, userId, lessonIds)
        │
        └─ for each course:
               completedLessons = count where status === "COMPLETED"
               nextLessonId = first lesson (by module.position ASC, lesson.position ASC)
                              where progress.status !== "COMPLETED" AND lesson.deleted_at IS NULL
                              Returns null if no progress OR if 100% complete

Dashboard RSC renders card states:
   completedLessons === 0            → State A: "Entrar no curso"
   0 < completedLessons < total      → State B: "Continuar de onde parei" + "Ver curso"
   completedLessons >= total > 0     → State C: "Meus Certificados" + "Rever curso"
                                         (primary button only if certificate_enabled)
```

### Recommended Project Structure (delta only)

```
src/
├── app/
│   ├── api/
│   │   └── lesson-progress/complete/route.ts    # MODIFY: add isCourseCompleted
│   ├── dashboard/page.tsx                        # MODIFY: card button states
│   └── admin/cursos/[slug]/course-edit-form.tsx  # MODIFY: cert section visibility
├── components/
│   └── course/lesson-player.tsx                  # MODIFY: showCompletionBanner state + banner
└── lib/
    └── courses/
        ├── queries.ts                            # MODIFY: nextLessonId + deleted_at filter
        └── types.ts                              # MODIFY: CourseSummary += nextLessonId
```

### Pattern 1: nextLessonId computation in getAvailableCourses

**What:** After computing `completedLessons`, iterate through the lessons sorted by `(module.position ASC, lesson.position ASC)` to find the first lesson whose lessonId is not in the progressMap as COMPLETED. Return `null` if all completed or none started.

**Critical detail:** The current `getAvailableCourses` Supabase query selects only `lessons(id)` — no `position` or `deleted_at`. To compute `nextLessonId` correctly, the query must be extended to `lessons(id, position, deleted_at)` AND `modules(id, position, ...)`. The `CourseSummaryQueryResult` type alias must also be updated.

**Current query shape (lines 94–121 of queries.ts):**
```typescript
modules (
  id,
  lessons (
    id          // ← only id; NO position, NO deleted_at
  )
)
```

**Required query shape:**
```typescript
modules (
  id,
  position,    // ← add: needed for ordering
  lessons (
    id,
    position,  // ← add: needed for ordering
    deleted_at // ← add: needed for D-12 filter
  )
)
```

**D-12 fix:** After fetching, filter lessons in-memory:
```typescript
// Before: (module.lessons ?? []).map(lesson => lesson.id)
// After:
(module.lessons ?? [])
  .filter((lesson) => !lesson.deleted_at)
  .map((lesson) => lesson.id)
```

**nextLessonId algorithm:**

```typescript
// Source: [VERIFIED: codebase analysis — queries.ts getAvailableCourses pattern]
function computeNextLessonId(
  modules: Array<{ id: string; position: number; lessons: Array<{ id: string; position: number; deleted_at: string | null }> | null }>,
  progressMap: Map<string, { status: string }>
): string | null {
  const orderedLessons = modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((module) =>
      (module.lessons ?? [])
        .filter((lesson) => !lesson.deleted_at)
        .slice()
        .sort((a, b) => a.position - b.position)
    );

  const firstIncomplete = orderedLessons.find(
    (lesson) => progressMap.get(lesson.id)?.status !== "COMPLETED"
  );

  return firstIncomplete?.id ?? null;
}
```

**Return value semantics (D-05):**
- `null` when `completedLessons === 0` (no progress at all → "Entrar no curso")
- `null` when `completedLessons >= totalLessons && totalLessons > 0` (fully done → no "Continuar")
- `string` when partial progress (the first incomplete lesson)

Note: `computeNextLessonId` naturally returns `null` in both null-cases: if no progress, the first lesson is always "incomplete" so it returns lesson[0] — WAIT, that is wrong. If `completedLessons === 0`, every lesson is incomplete, so `firstIncomplete` returns the very first lesson, not `null`. The caller in `getAvailableCourses` must apply the rule: if `completedLessons === 0`, set `nextLessonId = null`. The dashboard page logic then knows "no progress" and shows State A.

**Revised pattern:**
```typescript
const nextLessonId = completedLessons === 0
  ? null
  : computeNextLessonId(course.modules ?? [], progressByLessonId);
// computeNextLessonId returns null when all complete (find returns undefined)
```

This gives the three expected states without extra checks.

**CourseSummary type change cascade:** `CourseSummary = CourseRow & ProgressStats` currently. Adding `nextLessonId: string | null` is a breaking type change that cascades to consumers. The full consumer audit is in the "CourseSummary Cascade" section below.

### Pattern 2: isCourseCompleted flag in route.ts

**What:** The `issueCertificateBestEffort` function currently returns `void`. It must return a boolean (`true` if course is complete) so the route handler can include it in the JSON response.

**Current shape (lines 147–161 of route.ts):**
```typescript
async function issueCertificateBestEffort(userId: string, courseId: string) {
  try {
    const result = await ensureCourseCertificateIssued({ userId, courseId });
    if (result.status === "issued") { /* log */ }
  } catch (error) { /* warn */ }
}
// Called as: await issueCertificateBestEffort(user.id, courseId);
// Response: return NextResponse.json({ ok: true });
```

**Required shape:**
```typescript
async function issueCertificateBestEffort(userId: string, courseId: string): Promise<boolean> {
  try {
    const result = await ensureCourseCertificateIssued({ userId, courseId });
    if (result.status === "issued") { /* log */ }
    // Both "issued" and "already_issued" mean the course is/was complete
    return result.status === "issued" || result.status === "already_issued";
  } catch (error) {
    /* warn */
    return false; // best-effort: don't fail the main response
  }
}
```

Then in the main handler (both the normal path and the admin fallback path):
```typescript
const isCourseCompleted = await issueCertificateBestEffort(user.id, courseId);
return NextResponse.json({ ok: true, isCourseCompleted });
```

**Important subtlety:** The issuer returns `"already_issued"` even when the student marks a lesson they already completed (the certificate was issued at some earlier point). That means `isCourseCompleted` will be `true` even for lessons completed on a 100%-done course. From a UX perspective this is CORRECT — D-02 says both `"issued"` and `"already_issued"` should set `isCourseCompleted: true`, because the student's course IS completed. The banner appearing again on an already-completed course is harmless (it just reconfirms). However, the banner must not appear if `initialIsCompleted === true` at page load — that is already stated in the UI-SPEC: "Banner does not appear if the lesson was already completed before page load". Since `showCompletionBanner` is initialized to `false` and only set to `true` by the API response, this is naturally handled: if the student opened an already-completed lesson (initialIsCompleted=true), `markLessonAsCompleted` returns early before calling the API (due to `if (completionRef.current || savingRef.current) return`), so the banner never fires.

### Pattern 3: Dashboard card button state logic

**What:** Replace the single `<Link>` in `dashboard/page.tsx` (line 192–198) with conditional rendering based on `completedLessons`, `totalLessons`, `nextLessonId`, and `certificate_enabled`.

**Current (lines 192–198 of dashboard/page.tsx):**
```tsx
<Link
  href={`/curso/${course.slug}`}
  className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
>
  Entrar no curso
</Link>
```

**Required (D-06, exact copy strings from UI-SPEC):**
```tsx
<div className="mt-4 flex flex-wrap items-center gap-2">
  {course.completedLessons === 0 ? (
    <Link href={`/curso/${course.slug}`}
      className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
    >Entrar no curso</Link>
  ) : course.completedLessons >= course.totalLessons && course.totalLessons > 0 ? (
    <>
      {course.certificate_enabled && (
        <Link href="#certificados"
          className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
        >Meus Certificados</Link>
      )}
      <Link href={`/curso/${course.slug}`}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >Rever curso</Link>
    </>
  ) : (
    <>
      <Link href={`/curso/${course.slug}/aula/${course.nextLessonId}`}
        className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >Continuar de onde parei</Link>
      <Link href={`/curso/${course.slug}`}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
      >Ver curso</Link>
    </>
  )}
</div>
```

Also: add `id="certificados"` to the `<MyCertificates>` section wrapper (currently at line 143, rendered as `<section>` inside `MyCertificates` component or directly in dashboard — need to verify wrapper element).

**Verification needed:** The `MyCertificates` component is a separate file (`src/components/certificates/my-certificates.tsx`). The `id="certificados"` must be on the *outer element* in `dashboard/page.tsx` that wraps `<MyCertificates>`. Looking at dashboard/page.tsx line 143: `{role !== "admin" ? <MyCertificates certificates={studentCertificates} /> : null}` — this is a bare component with no wrapper `<section>` in `dashboard/page.tsx`. The planner must decide: (a) add a wrapper `<section id="certificados">` around `<MyCertificates>` in `dashboard/page.tsx`, or (b) verify if `MyCertificates` itself renders a `<section>` element and add the `id` as a prop. Given CONTEXT.md says "do not touch `my-certificates.tsx`", option (a) is correct: wrap in `<section id="certificados">` in `dashboard/page.tsx`.

### Pattern 4: Admin cert form conditional visibility

**What:** `course-edit-form.tsx` already renders all five certificate fields (lines 162–228). The delta is controlled visibility via React state.

**The component is already `"use client"`** — no directive change needed.

**Add to existing state declarations (near line 47–57):**
```typescript
const [certificateEnabled, setCertificateEnabled] = useState(course.certificate_enabled);
```

**Modify the checkbox (line 164–172):** Change `defaultChecked` to `checked` and add `onChange`:
```tsx
<input
  type="checkbox"
  name="certificate_enabled"
  checked={certificateEnabled}
  onChange={(e) => setCertificateEnabled(e.target.checked)}
  className="h-4 w-4 rounded border-slate-300"
/>
```

**Wrap the four dependent fields (lines 175–227) in:**
```tsx
<div className={certificateEnabled ? "" : "hidden"}>
  {/* template URL, workload, signer name, signer role fields */}
</div>
```

**Add explanatory paragraph** after the checkbox, inside the `<section>`:
```tsx
<p className="text-xs text-slate-500">
  O certificado é emitido automaticamente quando o aluno conclui 100% das aulas.
  Adicionar novas aulas não invalida certificados já emitidos.
</p>
```

**Add hint to template URL field** (inside the label for `certificate_template_url`, after the existing input, before `FieldError`):
```tsx
<p className="text-xs text-slate-500">
  Faça upload da imagem no bucket público do Supabase Storage e cole a URL aqui.
  Formato recomendado: PNG landscape 1754×1240 px.
</p>
```

**No action/schema changes needed:** `updateCourseAction` and `updateCourseSchema` already handle all five certificate fields. [VERIFIED: upsert-course.ts lines 137–179, schema.ts lines 69–155]

### Anti-Patterns to Avoid

- **Adding `position` to Supabase foreign table order without verifying Supabase JS syntax:** The existing `getCourseWithContent` uses `.order("position", { foreignTable: "modules", ascending: true })` — follow this exact syntax. [VERIFIED: queries.ts lines 222–224]
- **Using Supabase DB-level sort for `nextLessonId`:** The current `getAvailableCourses` does NOT use `order()` on lessons/modules. Compute sort in-memory after fetch (consistent with existing pattern). Adding a DB-level sort would require changing the query chain and risks breaking the existing `CourseSummaryQueryResult` type.
- **Mutating `issueCertificateBestEffort` to throw on best-effort failures:** It currently swallows errors with `catch`. Keep this — certificate issuance failure must never block the main progress save response.
- **Using `defaultChecked` with `onChange` for controlled state:** Either use `defaultChecked` (uncontrolled) or `checked` + `onChange` (controlled). For conditional visibility based on checkbox state, must use controlled: `checked={certificateEnabled}` + `onChange`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom PDF logic | `pdf.ts` already built | Font support, cert layout, timezone all solved |
| Certificate issuance idempotency | Custom race guard | `issuer.ts` already handles `already_issued` + UNIQUE violation retry | Concurrent requests covered |
| Signed URL for download | Custom presign | `/api/certificates/signed-url` + Supabase Storage | TTL, auth, bucket policy already configured |
| Progress tracking API | New endpoint | `/api/lesson-progress/complete` already upserts | Idempotent, RLS + admin fallback in place |
| Supabase query client management | New client factory | `resolveClient(client?)` helper in `queries.ts` | Allows passing existing client or auto-creating |

**Key insight:** The certificate and progress backend is complete. Phase 3 is a UI wiring exercise with one small API change.

---

## CourseSummary Type Change Cascade

Adding `nextLessonId: string | null` to `CourseSummary` is a type-level breaking change. All locations that consume `CourseSummary` need to be audited.

**Current type (types.ts line 18):**
```typescript
export type CourseSummary = CourseRow & ProgressStats;
```

**All consumers of `CourseSummary` found in the codebase:**

| File | Usage | Impact |
|------|-------|--------|
| `src/lib/courses/queries.ts` | Returns `CourseSummary[]` from `getAvailableCourses`; `LessonWithCourseContext.course: CourseSummary` | Must populate `nextLessonId` in return object |
| `src/app/dashboard/page.tsx` | Receives `CourseSummary[]` from `getAvailableCourses`; maps over courses | Can access `course.nextLessonId` — TypeScript will require it to exist in the type |
| `src/lib/courses/queries.ts` — `getLessonWithCourseContext` | Returns `{ course: CourseSummary, ... }` but uses `buildProgressStats(0, 0)` which doesn't set `nextLessonId` | Must add `nextLessonId: null` to the spread there |

**The `getLessonWithCourseContext` issue (lines 410–417 of queries.ts):**
```typescript
return {
  course: {
    ...course,
    ...buildProgressStats(0, 0),   // ← after type change, TS will complain: nextLessonId missing
  },
  module: lessonModule,
  lesson: normalizedLesson,
};
```
Fix: add `nextLessonId: null` explicitly to this object.

[VERIFIED: codebase grep — only two call sites for getAvailableCourses, one call site for getLessonWithCourseContext as consumer of CourseSummary]

---

## Common Pitfalls

### Pitfall 1: `nextLessonId` null when `completedLessons === 0`
**What goes wrong:** If `nextLessonId` is computed as the first incomplete lesson, and no lessons are completed, it returns `lesson[0].id` — a valid UUID. The dashboard then renders the "Continuar" button (State B) instead of "Entrar no curso" (State A).
**Why it happens:** `computeNextLessonId` has no knowledge of "whether any progress exists".
**How to avoid:** In `getAvailableCourses`, compute `nextLessonId` conditionally: `completedLessons === 0 ? null : computeNextLessonId(...)`. [VERIFIED: D-05 and D-06 in CONTEXT.md]
**Warning signs:** Dashboard shows "Continuar de onde parei" for a course the student never opened.

### Pitfall 2: `deleted_at` filter missing from lesson count denominator
**What goes wrong:** A soft-deleted lesson stays in `totalLessons`, inflating the denominator. Student who completed all active lessons never reaches 100%.
**Why it happens:** Current `getAvailableCourses` query fetches `lessons(id)` without `deleted_at`, so in-memory filter was impossible before.
**How to avoid:** Add `deleted_at` to the select and filter before counting (D-12).
**Warning signs:** `completionPercentage` never reaches 100 even after completing all visible lessons.

### Pitfall 3: Double-counting in progress calculation after D-12 fix
**What goes wrong:** After filtering soft-deleted lessons from `lessonIds`, the `progressByLessonId` lookup still uses the unfiltered `uniqueLessonIds`. This is fine — progress rows for deleted lessons simply won't be counted since their IDs are excluded. But the `uniqueLessonIds` passed to `getLessonProgressByLessonId` should also exclude deleted lessons, to avoid fetching unnecessary progress rows.
**How to avoid:** Compute `filteredLessonIds` (deleted_at IS NULL) first; use only those for both `progressByLessonId` and `lessonIds`.

### Pitfall 4: `isCourseCompleted` showing banner on already-completed lessons at page load
**What goes wrong:** If a student navigates to a lesson they already completed (`initialIsCompleted: true`), the banner should not show. But if `isCourseCompleted: true` is somehow returned, the banner fires.
**Why it happens:** Won't happen in practice because `markLessonAsCompleted` guards with `if (completionRef.current) return` — it never calls the API for already-completed lessons. [VERIFIED: lesson-player.tsx line 121]
**Warning signs:** Banner appears immediately on page load without the student clicking anything.

### Pitfall 5: `checked` vs `defaultChecked` conflict in certificate form
**What goes wrong:** If `defaultChecked={course.certificate_enabled}` is used alongside a state variable for visibility, React emits a warning ("You provided a `checked` prop to a form field without an `onChange` handler") and the toggle does not control visibility.
**How to avoid:** Fully commit to controlled pattern: `checked={certificateEnabled}` + `onChange={(e) => setCertificateEnabled(e.target.checked)}`. [VERIFIED: React 19 controlled component contract]

### Pitfall 6: `#certificados` anchor not resolving
**What goes wrong:** "Meus Certificados" button uses `href="#certificados"`. If no element with `id="certificados"` exists on the page, the click scrolls to the top.
**How to avoid:** Add `<section id="certificados">` wrapper around `<MyCertificates>` in `dashboard/page.tsx`. Do NOT modify `my-certificates.tsx` itself (CONTEXT.md: do not touch).
**Warning signs:** Clicking "Meus Certificados" scrolls to top of page.

---

## Code Examples

### getAvailableCourses query select extension

```typescript
// Source: [VERIFIED: queries.ts existing pattern + D-05/D-12 requirements]
// Change the modules select from:
//   modules ( id, lessons ( id ) )
// To:
modules (
  id,
  position,
  lessons (
    id,
    position,
    deleted_at
  )
)
```

The `CourseSummaryQueryResult` type alias must also gain `position` on both module and lesson:
```typescript
type CourseSummaryQueryResult = CourseRow & {
  modules: ({
    lessons: Pick<LessonRow, "id" | "position" | "deleted_at">[] | null;
  } & Pick<ModuleRow, "id" | "position">)[] | null;
};
```

### issueCertificateBestEffort return value

```typescript
// Source: [VERIFIED: route.ts lines 147-161 + issuer.ts EnsureCourseCertificateIssuedResult type]
async function issueCertificateBestEffort(userId: string, courseId: string): Promise<boolean> {
  try {
    const result = await ensureCourseCertificateIssued({ userId, courseId });
    if (result.status === "issued") {
      logger.info("Certificado emitido automaticamente apos concluir aula", {
        userId, courseId, certificateId: result.certificate.id,
      });
    }
    return result.status === "issued" || result.status === "already_issued";
  } catch (error) {
    logger.warn("Falha no modo best effort para emissao de certificado", {
      userId, courseId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
```

### LessonPlayer banner state addition

```typescript
// Source: [VERIFIED: lesson-player.tsx lines 102-165 + D-01/D-02/D-03]
// Add to state declarations (after existing useState calls):
const [showCompletionBanner, setShowCompletionBanner] = useState(false);

// In markLessonAsCompleted, after setIsCompleted(true):
const data = await response.json() as { ok: boolean; isCourseCompleted?: boolean };
if (data.isCourseCompleted === true) {
  setShowCompletionBanner(true);
}
```

Note: The current code does `await fetch(...)` but does not parse the response body on success (line 148 just checks `response.ok`). The response body must now be read: replace the `if (!response.ok)` block with a full parse pattern.

```typescript
// Source: [VERIFIED: lesson-player.tsx lines 136-150]
// Current:
const response = await fetch(/* ... */);
if (!response.ok) {
  const responseBody = (await response.json().catch(() => null)) as ...;
  // error handling
}
completionRef.current = true;
setIsCompleted(true);

// Required:
const response = await fetch(/* ... */);
if (!response.ok) {
  const responseBody = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
  // ... existing error handling unchanged
}
const responseBody = (await response.json().catch(() => null)) as { ok: boolean; isCourseCompleted?: boolean } | null;
completionRef.current = true;
setIsCompleted(true);
if (responseBody?.isCourseCompleted === true) {
  setShowCompletionBanner(true);
}
```

### Banner markup (exact from UI-SPEC)

```tsx
// Source: [VERIFIED: 03-UI-SPEC.md Component Inventory §2]
// Position: inside <div className="space-y-2"> (line 234 of lesson-player.tsx)
//           BEFORE the <div className="flex flex-wrap items-center gap-3"> row
{showCompletionBanner ? (
  <div
    role="status"
    aria-live="polite"
    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700"
  >
    Curso concluído!{" "}
    <a
      href="/dashboard"
      className="font-semibold underline hover:text-emerald-800"
    >
      Seu certificado está disponível no painel.
    </a>
  </div>
) : null}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Toast notifications for completion | Inline banner (no toast lib needed) | D-01 decision | No new dependency; matches existing inline feedback pattern |
| Separate save button for cert section | Reuse existing "Salvar rascunho" | D-09 decision | Less form state complexity |
| Client-side progress calculation | Server-side in `getAvailableCourses` | Existing design | RSC renders correct data server-side |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `nextLessonId: null` when `completedLessons === 0` prevents "Continuar" button from appearing | Pattern 1 | Dashboard shows wrong CTA button state |
| A2 | `already_issued` from issuer means course was already 100% complete, so `isCourseCompleted: true` is correct | Pattern 2 | Stale banner on already-completed lessons (harmless but slightly confusing) |

**Both assumptions are low-risk and consistent with D-02 and D-05 from CONTEXT.md.**

---

## Open Questions

1. **Response body parse in LessonPlayer when `response.ok`**
   - What we know: current code does not call `response.json()` on the success path (only on error path). Adding `isCourseCompleted` to the response requires parsing the body.
   - What's unclear: whether calling `response.json()` after the `if (!response.ok)` error block is correct (the body has already been consumed in the error case — but the error case `throw`s, so execution never reaches the success parse).
   - Recommendation: restructure as: `if (!response.ok) { /* parse and throw */ } const data = await response.json()`. This is safe because the error path always throws.

2. **Admin form `defaultChecked` → controlled checkbox migration**
   - What we know: `course-edit-form.tsx` uses `defaultChecked={course.certificate_enabled}` (line 168). Phase 3 must change this to controlled to enable visibility toggling.
   - What's unclear: whether this breaks any existing test for the form.
   - Recommendation: Search `upsert-course.test.ts` — it tests Server Actions, not the React form component. No test should break from the controlled switch.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is a pure TypeScript/React delta with no new external dependencies. All required tools (Node, npm, Supabase JS, Vitest) are already in use by the project.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (node environment, no jsdom) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/courses/queries.test.ts src/app/api/lesson-progress` |
| Full suite command | `npm run test:ci` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROG-01 | `completionPercentage` computed correctly | unit | `npx vitest run src/lib/courses/queries.test.ts` | ✅ (existing tests cover this) |
| PROG-02 | `nextLessonId` is first incomplete lesson in position order | unit | `npx vitest run src/lib/courses/queries.test.ts` | ❌ Wave 0 — new tests needed |
| PROG-02 | `nextLessonId` is `null` when `completedLessons === 0` | unit | `npx vitest run src/lib/courses/queries.test.ts` | ❌ Wave 0 |
| PROG-02 | `nextLessonId` is `null` when course 100% complete | unit | `npx vitest run src/lib/courses/queries.test.ts` | ❌ Wave 0 |
| PROG-03 | Already tested by existing API route tests | unit | `npx vitest run src/app/api` | ✅ (no new test needed) |
| PROG-04 | API returns `isCourseCompleted: true` when issuer returns `"issued"` | unit | `npx vitest run src/app/api/lesson-progress` | ❌ Wave 0 — new test file needed |
| PROG-04 | API returns `isCourseCompleted: true` when issuer returns `"already_issued"` | unit | `npx vitest run src/app/api/lesson-progress` | ❌ Wave 0 |
| PROG-04 | API returns `isCourseCompleted: false` when issuer returns `"not_eligible"` | unit | `npx vitest run src/app/api/lesson-progress` | ❌ Wave 0 |
| CERT-01 | Idempotent — covered by issuer.test.ts | unit | `npx vitest run src/lib/certificates/issuer.test.ts` | ✅ |
| CERT-05 | `already_issued` prevents re-issuance — covered by issuer.test.ts | unit | `npx vitest run src/lib/certificates/issuer.test.ts` | ✅ (verify coverage; add explicit test if missing) |
| D-12 | Soft-deleted lessons excluded from `totalLessons` denominator | unit | `npx vitest run src/lib/courses/queries.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/courses/queries.test.ts`
- **Per wave merge:** `npm run test:ci`
- **Phase gate:** Full suite green (`npm run test:ci`) + `npm run lint` (zero warnings) + `npm run typecheck` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] New test cases in `src/lib/courses/queries.test.ts` — covers PROG-02 (`nextLessonId` computation: null when 0 progress, correct lesson when partial, null when 100%) and D-12 (deleted_at filter on denominator)
- [ ] New test file `src/app/api/lesson-progress/complete/route.test.ts` — covers PROG-04 (`isCourseCompleted` in response for all issuer result statuses)
- [ ] Verify `src/lib/certificates/issuer.test.ts` has explicit test for `already_issued` behavior (D-10/CERT-05) — if not, add one test case

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes — progress and cert routes require auth | `createSupabaseServerClient().auth.getUser()` on every request — already implemented in route.ts |
| V3 Session Management | no new session changes | — |
| V4 Access Control | yes — admin cert config requires admin role | `requireAdminUser()` in `updateCourseAction` — already implemented |
| V5 Input Validation | yes — admin cert fields | `updateCourseSchema` in `schema.ts` — already covers all certificate fields with Zod |
| V6 Cryptography | no new crypto | Certificate code uses `crypto.randomUUID()` — already in issuer.ts |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student marks someone else's lesson complete | Tampering | `user_id` taken from server session, never from request body — already correct in route.ts |
| Student accesses admin cert config endpoint | Elevation of Privilege | `updateCourseAction` calls `requireAdminUser()` — already correct |
| `isCourseCompleted` manipulation by client | Tampering | Flag is computed server-side; client cannot inject it — correct by design |
| Soft-deleted lesson IDs in progress payload | Tampering | Lesson existence validated by `supabase.from("lessons").select(...).eq("id", lessonId)` before upsert — already correct |

---

## Sources

### Primary (HIGH confidence)

All findings in this research were verified by direct inspection of source files in this session. No external lookups were required.

- `src/app/api/lesson-progress/complete/route.ts` — current route structure, `issueCertificateBestEffort` signature
- `src/lib/courses/queries.ts` — `getAvailableCourses` full implementation, `CourseSummaryQueryResult` type, all consumer functions
- `src/lib/courses/types.ts` — `CourseSummary` definition and all consuming types
- `src/lib/courses/schema.ts` — `updateCourseSchema` — all certificate fields already present
- `src/app/actions/upsert-course.ts` — `updateCourseAction` — saves all certificate fields already
- `src/components/course/lesson-player.tsx` — `markLessonAsCompleted` flow, state declarations, JSX structure
- `src/app/dashboard/page.tsx` — current card rendering, `MyCertificates` usage
- `src/app/admin/cursos/[slug]/course-edit-form.tsx` — certificate section lines 162–228, existing state pattern
- `src/app/admin/cursos/[slug]/page.tsx` — page structure
- `src/lib/certificates/issuer.ts` — `EnsureCourseCertificateIssuedResult` type, all status values
- `src/lib/courses/queries.test.ts` — existing test patterns for queries
- `src/lib/certificates/issuer.test.ts` — existing coverage for issuer
- `.planning/phases/03-progress-certificates/03-CONTEXT.md` — all locked decisions
- `.planning/phases/03-progress-certificates/03-UI-SPEC.md` — exact markup, copy strings, class names
- `vitest.config.ts` — test environment (node, no jsdom)
- `.planning/config.json` — `nyquist_validation: true` confirmed

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; verified in package.json
- Architecture: HIGH — all patterns derived from actual source files read in this session
- Pitfalls: HIGH — derived from reading current code and identifying gaps against D-01 through D-12
- Test map: HIGH — existing test files inventoried, gaps identified precisely

**Research date:** 2026-04-30
**Valid until:** 2026-05-30 (stable stack, no external dependencies to drift)

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 3 |
|-----------|-------------------|
| `npm run lint` zero-warning policy | All new code must pass `eslint . --max-warnings=0`; no unused variables, no type assertions without comment |
| `npm run typecheck` must pass | `CourseSummary` type change must be propagated to all consumers before committing |
| Zod for all validation | Certificate fields already in `updateCourseSchema`; no inline validation in actions |
| Typed Database generic on every Supabase call | `CourseSummaryQueryResult` must be kept aligned with actual select shape |
| No `console.*` in server code — use `logger` | `issueCertificateBestEffort` already uses `logger`; maintain this in any new server code |
| UI text is Portuguese (pt-BR) | All copy strings from UI-SPEC must be used verbatim — verified matches CONTEXT.md strings |
| `src/lib/supabase/admin.ts` only when bypassing RLS | `issueCertificateBestEffort` → `ensureCourseCertificateIssued` uses admin client correctly — no change |
| Vitest node environment, no jsdom | Tests are pure function / server logic tests only; no React DOM testing |
| Three Supabase client factories — do not mix | Route uses `createSupabaseServerClient` for user auth + `createSupabaseAdminClient` for fallback — existing pattern, do not change |
