---
phase: 03-progress-certificates
plan: "04"
subsystem: lesson-player-ui, course-edit-form-ui
tags: [ui, react, client-component, certificate, progress, banner]
dependency_graph:
  requires:
    - "03-02: isCourseCompleted flag in POST /api/lesson-progress/complete response"
  provides:
    - "showCompletionBanner state in LessonPlayer driven by isCourseCompleted API flag"
    - "certificateEnabled controlled state in CourseEditForm with conditional field visibility"
  affects:
    - "src/components/course/lesson-player.tsx (student-facing completion UX)"
    - "src/app/admin/cursos/[slug]/course-edit-form.tsx (admin certificate config UX)"
tech_stack:
  added: []
  patterns:
    - "React controlled checkbox (checked + onChange) replacing uncontrolled defaultChecked"
    - "Conditional className hidden/visible wrapper for dependent form fields"
    - "Inline emerald banner with role=status aria-live=polite for accessible completion feedback"
key_files:
  created: []
  modified:
    - src/components/course/lesson-player.tsx
    - src/app/admin/cursos/[slug]/course-edit-form.tsx
decisions:
  - "Banner renders as first child of space-y-2 div so it appears above the button row (per D-01/CONTEXT specifics)"
  - "Banner does not auto-dismiss — student must click the dashboard link to navigate (per D-03)"
  - "Response body is parsed only in the success path (after !response.ok check throws) — no double-consume risk"
  - "certificateEnabled wrapper uses className=hidden (display:none) not conditional rendering — per D-08 to avoid layout jank"
  - "mt-4 added to second inner grid to preserve visual separation between the two certificate field groups"
metrics:
  duration_seconds: 480
  completed_date: "2026-04-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 03 Plan 04: Completion Banner and Certificate Form Visibility Summary

**One-liner:** Wired `isCourseCompleted` API flag to a `showCompletionBanner` state in LessonPlayer rendering an emerald inline banner with `/dashboard` link, and added `certificateEnabled` controlled state to CourseEditForm hiding four dependent certificate fields via `className="hidden"` when the toggle is off.

## What Was Built

### Task 1 — LessonPlayer completion banner (PROG-04)

- Added `showCompletionBanner: boolean` state initialized to `false` after the `completionError` state declaration (line 106)
- In `markLessonAsCompleted` success path (after `if (!response.ok)` block throws), parsed the response body as `{ ok: boolean; isCourseCompleted?: boolean }` and called `setShowCompletionBanner(true)` when `isCourseCompleted === true`
- Added emerald banner as first child of `<div className="space-y-2">`, before the button row, with:
  - `role="status" aria-live="polite"` for screen reader accessibility
  - Exact copy: "Curso concluido! Seu certificado esta disponivel no painel." with `<a href="/dashboard">` link
  - Classes: `rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700`

### Task 2 — CourseEditForm certificate controlled state (CERT-03 admin UI)

- Added `certificateEnabled` state initialized from `course.certificate_enabled ?? false` (line 58)
- Converted `defaultChecked={course.certificate_enabled}` to fully controlled `checked={certificateEnabled}` + `onChange={(e) => setCertificateEnabled(e.target.checked)}`
- Added explanatory paragraph after `<FieldError errors={state.fieldErrors?.certificateEnabled} />`:
  "O certificado e emitido automaticamente quando o aluno conclui 100% das aulas. Adicionar novas aulas nao invalida certificados ja emitidos."
- Wrapped both dependent grid `<div>`s (template URL + workload hours grid, signer name + signer role grid) in `<div className={certificateEnabled ? "" : "hidden"}>` — fields use `display:none` when disabled
- Added hint text under `certificate_template_url` input: "Faca upload da imagem no bucket publico do Supabase Storage e cole a URL aqui. Formato recomendado: PNG landscape 1754x1240 px."

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | LessonPlayer completion banner wired to isCourseCompleted API flag | 4ab32d5 | src/components/course/lesson-player.tsx |
| 2 | CourseEditForm certificateEnabled controlled state with conditional field visibility | 6ebbf47 | src/app/admin/cursos/[slug]/course-edit-form.tsx |

## Verification Results

- `grep -n "showCompletionBanner" src/components/course/lesson-player.tsx` — 3 lines (state declaration, JSX conditional, setShowCompletionBanner call)
- `grep -n "isCourseCompleted" src/components/course/lesson-player.tsx` — 2 lines (type cast + if check)
- `grep -n 'role="status"' src/components/course/lesson-player.tsx` — 1 line
- `grep -n 'aria-live="polite"' src/components/course/lesson-player.tsx` — 1 line
- `grep -n "certificateEnabled" src/app/admin/cursos/[slug]/course-edit-form.tsx` — 4 lines (state init, checked=, onChange=, className conditional)
- `grep -n "defaultChecked" src/app/admin/cursos/[slug]/course-edit-form.tsx` — 0 lines (fully migrated)
- `grep -n '"hidden"' src/app/admin/cursos/[slug]/course-edit-form.tsx` — 1 semantic match (conditional wrapper; the other hit is type="hidden" which is unrelated)
- `grep -n "Adicionar novas aulas" src/app/admin/cursos/[slug]/course-edit-form.tsx` — 1 line
- `grep -n "1754" src/app/admin/cursos/[slug]/course-edit-form.tsx` — 1 line
- `npm run typecheck` — exit 0
- `npm run lint` — exit 0 (zero warnings)
- `npm run test:ci` — 19 test files, 98 tests, all passed

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `showCompletionBanner` is driven by real `isCourseCompleted` API flag; `certificateEnabled` is initialized from real `course.certificate_enabled` DB value.

## Threat Flags

None — no new network endpoints or auth paths introduced. Banner is cosmetic client state (T-03-04-01: accept). Certificate toggle only affects form UX; actual access control is in the server action `requireAdminUser()` (T-03-04-02: accept). Controlled checkbox emits standard FormData "on"/undefined handled by existing `updateCourseSchema` (T-03-04-03: accept).

## Self-Check: PASSED

- `src/components/course/lesson-player.tsx` — FOUND, modified (3 insertions)
- `src/app/admin/cursos/[slug]/course-edit-form.tsx` — FOUND, modified (14 insertions, 2 deletions)
- Commit 4ab32d5 — feat(03-04): LessonPlayer completion banner wired to isCourseCompleted API flag
- Commit 6ebbf47 — feat(03-04): CourseEditForm certificateEnabled controlled state with conditional field visibility
