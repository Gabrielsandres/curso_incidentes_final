---
phase: 03-progress-certificates
plan: "02"
subsystem: lesson-progress-api
tags: [tdd, api, certificates, progress]
dependency_graph:
  requires: []
  provides:
    - "isCourseCompleted flag in POST /api/lesson-progress/complete response"
    - "D-10/CERT-05 idempotency documented in issuer.test.ts"
  affects:
    - "src/components/course/lesson-player.tsx (Plan 04 reads isCourseCompleted)"
tech_stack:
  added: []
  patterns:
    - "Best-effort async function returning boolean instead of void"
    - "TDD RED/GREEN cycle for API route response shape"
key_files:
  created:
    - src/app/api/lesson-progress/complete/route.test.ts
  modified:
    - src/app/api/lesson-progress/complete/route.ts
    - src/lib/certificates/issuer.test.ts
decisions:
  - "issueCertificateBestEffort returns Promise<boolean> — true for issued/already_issued, false for not_eligible or exception"
  - "Both success paths (normal upsert and admin fallback) include isCourseCompleted in the JSON response"
  - "D-10/CERT-05: second call to ensureCourseCertificateIssued returns already_issued without re-generating PDF"
metrics:
  duration_seconds: 234
  completed_date: "2026-04-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
---

# Phase 03 Plan 02: isCourseCompleted Route Flag Summary

**One-liner:** Extended lesson completion API to return `isCourseCompleted: boolean` via `issueCertificateBestEffort` returning `Promise<boolean>`, enabling Plan 04 LessonPlayer banner without a page reload.

## What Was Built

- `issueCertificateBestEffort` refactored from `void` to `Promise<boolean>`: returns `true` when issuer status is `"issued"` or `"already_issued"`, `false` for `"not_eligible"` or on any thrown exception
- Both success paths in `route.ts` (`!error` normal path and `!adminError` admin fallback) now `await` the boolean and include `isCourseCompleted` in `NextResponse.json({ ok: true, isCourseCompleted })`
- All error paths remain unchanged — they still return `{ error: "..." }` with 4xx/5xx status
- New test file `route.test.ts` with 4 cases covering all issuer result states (RED/GREEN TDD cycle)
- D-10/CERT-05 idempotency explicitly documented in `issuer.test.ts` with a new test confirming `already_issued` on second call and no PDF/storage re-generation

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | RED — Failing tests for isCourseCompleted | 4a5f9d7 | src/app/api/lesson-progress/complete/route.test.ts |
| 2 | GREEN — issueCertificateBestEffort returns boolean | 531235c | src/app/api/lesson-progress/complete/route.ts |
| 3 | D-10/CERT-05 idempotency test | c3abf0e | src/lib/certificates/issuer.test.ts |

## Verification Results

- `npx vitest run src/app/api/lesson-progress/complete/route.test.ts` — 4/4 passed
- `npx vitest run src/lib/certificates/issuer.test.ts` — 5/5 passed (4 existing + 1 new D-10/CERT-05)
- `npm run typecheck` — exit 0
- `npm run lint` — exit 0
- `grep -n "isCourseCompleted" route.ts` — 4 lines (capture + 2 JSON responses + return expression)
- `grep -n "Promise<boolean>" route.ts` — 1 line (function signature)
- `grep -n "D-10/CERT-05" issuer.test.ts` — 1 line

## TDD Gate Compliance

- RED gate: commit `4a5f9d7` — `test(03-02): RED — failing tests for isCourseCompleted route flag` (4 tests failed as expected)
- GREEN gate: commit `531235c` — `feat(03-02): GREEN — issueCertificateBestEffort returns boolean + isCourseCompleted in response` (4 tests passed)
- REFACTOR gate: not needed — implementation was clean on first pass

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — `isCourseCompleted` is computed from real issuer result, no placeholder values.

## Threat Flags

None — no new network endpoints or auth paths introduced. `isCourseCompleted` is derived server-side from DB state (T-03-02-01: accept). Exception handling prevents issuer failure from blocking main response (T-03-02-02: mitigated). UserId always from session, not request body (T-03-02-03: accept).

## Self-Check: PASSED

- `/c/Users/gabri/OneDrive/Área de Trabalho/Pessoal/curso_incidentes_final/.claude/worktrees/agent-a9f003846599fd639/src/app/api/lesson-progress/complete/route.test.ts` — FOUND
- `/c/Users/gabri/OneDrive/Área de Trabalho/Pessoal/curso_incidentes_final/.claude/worktrees/agent-a9f003846599fd639/src/app/api/lesson-progress/complete/route.ts` — FOUND (modified)
- `/c/Users/gabri/OneDrive/Área de Trabalho/Pessoal/curso_incidentes_final/.claude/worktrees/agent-a9f003846599fd639/src/lib/certificates/issuer.test.ts` — FOUND (modified)
- Commit 4a5f9d7 — FOUND (RED)
- Commit 531235c — FOUND (GREEN)
- Commit c3abf0e — FOUND (D-10/CERT-05 test)
