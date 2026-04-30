---
phase: 03-progress-certificates
plan: "03"
subsystem: dashboard-ui
tags: [dashboard, cta, progress, certificates, anchor]
dependency_graph:
  requires:
    - ProgressStats.nextLessonId (from 03-01)
    - CourseSummary.certificate_enabled (existing)
  provides:
    - dashboard-3-state-cta
    - certificados-anchor
  affects:
    - src/app/dashboard/page.tsx
tech_stack:
  added: []
  patterns:
    - Conditional JSX rendering with ternary states in RSC
    - In-page anchor navigation with section id
key_files:
  created: []
  modified:
    - src/app/dashboard/page.tsx
decisions:
  - "State B href uses course.nextLessonId directly — null guard not needed because State B only renders when 0 < completedLessons < totalLessons, and nextLessonId is guaranteed non-null in that range (D-05)"
  - "section id='certificados' wraps the entire MyCertificates rendering block — the anchor resolves even when MyCertificates renders an empty state"
metrics:
  duration: "~5 min"
  completed: "2026-04-30"
  tasks_completed: 1
  files_changed: 1
requirements:
  - PROG-01
  - PROG-02
  - CERT-04
---

# Phase 03 Plan 03: Dashboard 3-State CTAs and Certificados Anchor Summary

**One-liner:** Replaced single "Entrar no curso" button in dashboard course cards with conditional three-state CTA logic driven by `completedLessons`, `totalLessons`, `nextLessonId`, and `certificate_enabled`; wrapped `MyCertificates` in `<section id="certificados">` for in-page anchor resolution.

## What Was Built

### src/app/dashboard/page.tsx

**Change 1 — Three-state CTA button logic:**

The single `<Link href="/curso/{slug}">Entrar no curso</Link>` was replaced with a conditional `<div className="mt-4 flex flex-wrap items-center gap-2">` containing three exclusive states:

- **State A** (`completedLessons === 0`): single primary button "Entrar no curso" → `/curso/{slug}`
- **State B** (`0 < completedLessons < totalLessons`): primary "Continuar de onde parei" → `/curso/{slug}/aula/{nextLessonId}` + secondary "Ver curso" → `/curso/{slug}`
- **State C** (`completedLessons >= totalLessons && totalLessons > 0`): primary "Meus Certificados" → `#certificados` (only when `certificate_enabled === true`) + secondary "Rever curso" → `/curso/{slug}`

Button class tokens match UI-SPEC exactly:
- Primary: `inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700`
- Secondary: `inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50`

**Change 2 — Certificados anchor:**

The inline `{role !== "admin" ? <MyCertificates ... /> : null}` was wrapped in `<section id="certificados">` so the `#certificados` href from State C resolves correctly via in-page navigation.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `grep "Continuar de onde parei"` | 1 match (line 230) |
| `grep 'id="certificados"'` | 1 match (line 144) |
| `grep "nextLessonId"` | 1 match (line 227) |
| `grep "Meus Certificados"` | 1 match (line 213) |
| `grep "Rever curso"` | 1 match (line 220) |
| `grep "Ver curso"` | 1 match (line 236) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `d80fb0e` | feat(03-03): dashboard 3-state CTAs and certificados anchor |

## Deviations from Plan

**Pre-execution baseline sync:** The worktree branch (`worktree-agent-a846087a4ce715d31`) was based on the Phase 02 tip commit (`7cec2af`) and lacked the Phase 03-01 data layer changes (`nextLessonId` type, updated queries). Applied `git rebase main` before implementation to bring in `ProgressStats.nextLessonId` from Plan 01 — without this the typecheck would have failed. No plan content changed; this was a worktree setup correction only.

No other deviations — plan executed exactly as written.

## Known Stubs

None — all CTA states use real computed data (`completedLessons`, `totalLessons`, `nextLessonId`, `certificate_enabled`) from the existing `getAvailableCourses` query extended in Plan 01. No hardcoded values or placeholder text.

## Threat Flags

None — the threat register in the plan covers both T-03-03-01 (nextLessonId UUID disclosure — accepted) and T-03-03-02 (client-side href manipulation — mitigated by middleware enrollment check). No new trust boundary introduced.

## Self-Check: PASSED

- [x] `src/app/dashboard/page.tsx` modified — confirmed by commit `d80fb0e`
- [x] Commit `d80fb0e` exists in git log
- [x] `grep "Continuar de onde parei"` returns exactly 1 line
- [x] `grep 'id="certificados"'` returns exactly 1 line
- [x] `grep "nextLessonId"` returns at least 1 line
- [x] `npm run typecheck` exits 0
- [x] `npm run lint` exits 0
