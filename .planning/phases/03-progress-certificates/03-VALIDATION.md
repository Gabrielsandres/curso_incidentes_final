# Phase 3: Progress & Certificates — Validation Strategy

**Phase:** 03-progress-certificates
**Framework:** Vitest (node environment — no jsdom)
**Config file:** `vitest.config.ts` (root)
**nyquist_validation:** enabled

---

## Quick-Run Commands

| Scope | Command |
|-------|---------|
| Queries only | `npx vitest run src/lib/courses/queries.test.ts` |
| API route only | `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` |
| Issuer only | `npx vitest run src/lib/certificates/issuer.test.ts` |
| All phase-3 tests | `npx vitest run src/lib/courses/queries.test.ts src/app/api/lesson-progress/complete src/lib/certificates/issuer.test.ts` |
| Full suite | `npm run test:ci` |

---

## Phase Requirements → Test Map

| Req ID | Behavior Under Test | Test Type | Automated Command | Wave |
|--------|---------------------|-----------|-------------------|------|
| PROG-01 | `completionPercentage` computed correctly | unit | `npx vitest run src/lib/courses/queries.test.ts` | existing |
| PROG-02 | `nextLessonId` is first incomplete lesson in `(module.position ASC, lesson.position ASC)` order | unit | `npx vitest run src/lib/courses/queries.test.ts` | Wave 0 (Plan 01) |
| PROG-02 | `nextLessonId` is `null` when `completedLessons === 0` (no progress) | unit | `npx vitest run src/lib/courses/queries.test.ts` | Wave 0 (Plan 01) |
| PROG-02 | `nextLessonId` is `null` when course is 100% complete | unit | `npx vitest run src/lib/courses/queries.test.ts` | Wave 0 (Plan 01) |
| PROG-03 | Lesson progress upsert — idempotent | unit | `npx vitest run src/app/api` | existing |
| PROG-04 | API returns `isCourseCompleted: true` when issuer returns `"issued"` | unit | `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` | Wave 0 (Plan 02) |
| PROG-04 | API returns `isCourseCompleted: true` when issuer returns `"already_issued"` | unit | `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` | Wave 0 (Plan 02) |
| PROG-04 | API returns `isCourseCompleted: false` when issuer returns `"not_eligible"` | unit | `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` | Wave 0 (Plan 02) |
| PROG-04 | Issuer failure (best-effort) does not block the main response | unit | `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` | Wave 0 (Plan 02) |
| CERT-01 | Certificate issuance is idempotent — duplicate insert handled | unit | `npx vitest run src/lib/certificates/issuer.test.ts` | existing |
| CERT-02 | PDF generated and stored on first issuance | unit | `npx vitest run src/lib/certificates/issuer.test.ts` | existing |
| CERT-03 | Certificate fields persist via updateCourseAction | unit | `npx vitest run src/app/actions` | existing (upsert-course.test.ts) |
| CERT-04 | Student certificate download — signed URL | manual | Visit `/dashboard`, click certificate download | existing infra |
| CERT-05 / D-10 | Calling `ensureCourseCertificateIssued` a second time returns `already_issued` — adding lessons does not invalidate existing certificate | unit | `npx vitest run src/lib/certificates/issuer.test.ts` | Wave 0 (Plan 02, Task 3) |
| D-12 | Soft-deleted lessons excluded from `totalLessons` denominator | unit | `npx vitest run src/lib/courses/queries.test.ts` | Wave 0 (Plan 01) |

---

## Behaviors NOT Automatable in This Environment

The following behaviors require visual / browser verification. This is a known constraint from CLAUDE.md:
> "There is no jsdom setup — write tests against pure functions / server logic, not React DOM."

| Behavior | Reason Not Automated | Manual Verification Step |
|----------|----------------------|--------------------------|
| Completion banner renders above button row in LessonPlayer | React DOM — no jsdom | Mark last lesson complete in browser; confirm emerald banner appears above the "Aula concluída" button |
| Banner does NOT appear on page load for already-completed lesson | React DOM — no jsdom | Navigate to an already-completed lesson; confirm no banner on load |
| `certificate_enabled` toggle hides/shows four dependent fields | React DOM — no jsdom | Toggle checkbox in admin form; confirm fields appear/disappear |
| "Continuar de onde parei" button navigates to correct lesson | Browser navigation | Click button on partial-progress course; confirm correct lesson URL |
| "Meus Certificados" anchor scrolls to `#certificados` section | Browser scroll | Click button on 100%-complete course; confirm scroll target |

---

## Sampling Rate

| Event | Command |
|-------|---------|
| Per task commit | `npx vitest run <task-specific file>` |
| Per wave merge | `npm run test:ci` |
| Phase gate (before /gsd-verify-work) | `npm run test:ci && npm run lint && npm run typecheck` |

---

## Wave 0 Gaps (new tests required, do not pre-exist)

- [ ] **Plan 01** — `src/lib/courses/queries.test.ts`: add cases for `nextLessonId` (null when 0 progress, correct UUID when partial, null when 100%) and D-12 (soft-deleted lesson excluded from denominator)
- [ ] **Plan 02** — `src/app/api/lesson-progress/complete/route.test.ts`: new file covering `isCourseCompleted` for all four issuer result states (`issued`, `already_issued`, `not_eligible`, thrown error)
- [ ] **Plan 02, Task 3** — `src/lib/certificates/issuer.test.ts`: add explicit test for D-10 / CERT-05 — `ensureCourseCertificateIssued` called a second time for same `userId + courseId` returns `already_issued` (idempotency when existing certificate is present)

---

## Phase Gate Checklist

Before calling `/gsd-verify-work`, confirm:

- [ ] `npm run test:ci` exits 0 (all tests pass, including new Wave 0 tests)
- [ ] `npm run lint` exits 0 (zero-warning policy)
- [ ] `npm run typecheck` exits 0 (strict TypeScript, CourseSummary cascade complete)
- [ ] Manual: completion banner verified in browser (mark last lesson; banner appears)
- [ ] Manual: `certificate_enabled` toggle verified in admin form (toggle hides/shows fields)
- [ ] Manual: "Continuar de onde parei" navigates to correct lesson
