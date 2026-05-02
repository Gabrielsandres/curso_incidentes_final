---
phase: 05-b2b-institution-manager
plan: 06
subsystem: middleware
tags: [middleware, route-gate, edge-runtime, dashboard, orphan-flash]
requirements: [INST-05, INST-06]
provides:
  - "middleware.ts gains a 4th role-gated route ring (/gestor)"
  - "dashboard renders amber flash banner on ?notice=orphan-manager"
  - "dashboard admin nav exposes /admin/instituicoes link"
  - "src/middleware.test.ts is a real test suite (9 passing tests, 0 it.todo)"
requires:
  - "src/lib/auth/roles.ts fetchUserRole (existing)"
  - "src/middleware.test.ts scaffold from plan 05-02"
affects:
  - "Plan 05-08 (/gestor/page.tsx) — orphan redirect to /dashboard?notice=orphan-manager will now display flash banner"
  - "Plan 05-05/05-07 (/admin/instituicoes/* pages) — admin nav link now points users there"
tech-stack:
  added: []
  patterns:
    - "4th route ring extending the existing 3-ring middleware (PROTECTED + ADMIN + GESTOR + AUTH)"
    - "Page-level orphan check (D-04 + Pitfall 1) — middleware never queries institution_members"
    - "Search-param flash banner pattern (no client JS, pure RSC)"
key-files:
  created:
    - ".planning/phases/05-b2b-institution-manager/05-06-SUMMARY.md"
  modified:
    - "middleware.ts (4 surgical changes — see Diff Summary)"
    - "src/app/dashboard/page.tsx (banner + admin nav link)"
    - "src/middleware.test.ts (8 it.todo → 9 passing tests)"
decisions:
  - "Use NextRequest/NextResponse directly under Vitest node env (no next/server mock) — keeps test on the real cookie/redirect surface"
  - "Orphan-manager flash uses search param ?notice=orphan-manager (D-02 Open Question 3) — toast lib not in repo"
  - "Admin nav 'Gerenciar instituições' placed between 'Gerenciar cursos' and 'Cadastrar usuario' per UI-SPEC §Admin pages line 296"
metrics:
  duration: "~5 min"
  completed: 2026-05-02
  tasks: 3
  files_modified: 3
---

# Phase 5 Plan 6: Middleware /gestor Ring + Dashboard Flash Summary

INST-05 enforced at the edge via a 4th middleware ring; admin nav surfaces /admin/instituicoes; orphan-manager flash banner wired on /dashboard.

## What Was Built

### 1. middleware.ts — 4th route ring (`/gestor`)

Four surgical changes, additive only (existing 3-ring logic byte-identical):

| # | Change | Lines |
|---|--------|-------|
| 1 | Add `/gestor` to `PROTECTED_ROUTES` | 8 |
| 2 | Add `GESTOR_ROUTES = ["/gestor"]` constant + `isGestorPath()` helper | 10, 21–23 |
| 3 | Insert gestor-gate block after admin-gate (D-02 rules) | 84–101 |
| 4 | Add `"/gestor/:path*"` to `config.matcher` | 106–113 |

**Gate behavior (per D-02):**
- Unauthenticated on `/gestor` → handled by existing `isProtectedPath` ring → `/login?redirectTo=/gestor`
- `role === "admin"` → redirect `/admin/instituicoes` (admin doesn't use `/gestor`)
- `role !== "institution_manager"` → redirect `/dashboard`
- `role === "institution_manager"` → fall through (allowed)

**Inline comment preserved (Pitfall 1 lesson):** orphan-manager check is intentionally NOT in middleware. Middleware runs every request — the orphan check belongs in `/gestor/page.tsx` where it incurs DB cost only on `/gestor` navigations (D-04).

Diff: +32 / −2 lines.

### 2. src/app/dashboard/page.tsx — banner + admin nav link

Two surgical edits:

1. **searchParams + flash banner.** Component signature now accepts `searchParams: Promise<{ notice?: string }>` (Next.js 16 App Router shape). When `notice === "orphan-manager"`, an amber `role="status"` banner renders at the top of `<main>` with the locked pt-BR copy: *"Sua instituição ainda não foi configurada. Entre em contato com a MDHE."* (UI-SPEC §Error states line 255).

2. **Admin nav link "Gerenciar instituições"** inserted between *Gerenciar cursos* and *Cadastrar usuario*, mirroring the existing pill className for visual consistency (UI-SPEC §Admin pages line 296).

Diff: +24 / −2 lines. All existing logic preserved.

### 3. src/middleware.test.ts — real test suite

Wave 0 scaffold (from 05-02) had 8 `it.todo` placeholders + a sentinel. Converted to 9 real passing tests:

**`describe("middleware /gestor gate (INST-05)")` — 5 tests**
- Unauthenticated → `/login?redirectTo=%2Fgestor` (status 307)
- `role="student"` → `/dashboard` (307)
- `role="admin"` → `/admin/instituicoes` (307; D-02)
- `role="institution_manager"` → pass-through (no redirect, no Location header)
- Orphan check NOT in middleware — `fetchUserRole` is the only role lookup; supabase mock exposes only `auth.getUser` (no `.from("institution_members")` shape)

**`describe("middleware /admin gate (regression)")` — 2 tests**
- `role="institution_manager"` on `/admin` → `/dashboard` (admin-only ring still enforced)
- `role="admin"` on `/admin` → pass-through

**`describe("middleware matcher config")` — 2 tests**
- `config.matcher` contains `/gestor/:path*`
- All 4 existing matcher entries preserved (regression)

**Test technique chosen (header comment explains):** mock `@supabase/ssr` + `@/lib/auth/roles` + `@/lib/env`; do NOT mock `next/server`. NextRequest/NextResponse work under Vitest's node env, and bypassing them would weaken coverage of the real cookie/redirect surface.

Diff: +135 / −33 lines.

## Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✓ exit 0 |
| `npm run lint` (zero-warning) | ✓ exit 0 |
| `npx vitest run src/middleware.test.ts` | ✓ 9 passed / 0 todo / 0 failed |
| `npm run test:ci` | ✓ 29 files, 178 passed, 31 todo (all 31 todos belong to other Wave 0 scaffolds — unchanged) |
| `npm run build` (Edge-runtime smoke) | ✓ build succeeds, all routes compile |
| `grep "GESTOR_ROUTES" middleware.ts` | ✓ |
| `grep "isGestorPath" middleware.ts` | ✓ |
| `grep "/admin/instituicoes" middleware.ts` | ✓ |
| `grep "/gestor/:path" middleware.ts` | ✓ |
| `grep "orphan-manager" src/app/dashboard/page.tsx` | ✓ |
| `grep "Sua instituição ainda não foi configurada" src/app/dashboard/page.tsx` | ✓ |
| `grep "Gerenciar instituições" src/app/dashboard/page.tsx` | ✓ |
| `grep "bg-amber-50" src/app/dashboard/page.tsx` | ✓ |
| `it.todo` count in middleware.test.ts | 0 (was 8) |

## Commits

| # | Hash | Type | Subject |
|---|------|------|---------|
| 1 | `fe9f50a` | feat | extend middleware with /gestor route ring |
| 2 | `5cdbec1` | feat | add admin nav link + orphan-manager flash to /dashboard |
| 3 | `9aa9457` | test | convert middleware test scaffold to passing tests |

Final stats: 3 files changed, +191 / −37.

## Threat Model Resolution

| Threat ID | Disposition | Status |
|-----------|-------------|--------|
| T-05-06-01 (Elevation: student/admin reaches /gestor) | mitigate | Covered by 4 role-path tests + 2 regression tests |
| T-05-06-02 (Matcher misconfig) | mitigate | `matcher includes '/gestor/:path*'` test asserts the exact entry; CRITICAL inline comment retained in plan |
| T-05-06-03 (Info disclosure via flash) | accept | Banner copy reveals nothing institution-specific |
| T-05-06-04 (Tampering: notice param injection) | mitigate | Strict `=== "orphan-manager"` equality; no input interpolation |
| T-05-06-05 (DoS: fetchUserRole every request) | accept | Same cost shape as existing admin gate; one indexed PK lookup |
| T-05-06-06 (Cookie tampering bypass) | mitigate | Existing `getUser()` (validates with auth server) preserved verbatim |

## Deviations from Plan

None. The plan was executed exactly as written. Three observations:

- The plan's existing `dashboard/page.tsx` already used a non-standard indentation on the `<Link href="/admin/usuarios">` opening tag (the `<` was not aligned). I did NOT reformat that pre-existing line to keep the diff minimal — the new `Gerenciar instituições` link uses correct indentation, and the regression block remains visually consistent with the rest of the file (lint passed zero-warning).
- The plan suggested `vi.mock("next/server", ...)` as a fallback if real `next/server` proved intractable under Vitest. It did NOT — `NextRequest` and `NextResponse` work correctly in the node env, so no mock was needed (preferred per plan: "PREFER to test through the public middleware boundary").
- A test was added for "matcher preserves the existing 3-ring entries" beyond the plan's minimum to lock in regression coverage on the matcher itself (defense for T-05-06-02).

## Auth Gates

None encountered.

## Known Stubs

None. The orphan-manager flash banner displays a real conditional based on the search param; the admin nav link points to `/admin/instituicoes` which is the routing target for plans 05-05/05-07. Until those land, the link will 404 — that is expected behavior tracked by phase wave dependencies, not a stub in this plan's deliverable.

## Downstream Unblocking

This plan **partially unblocks plan 05-08** (`/gestor/page.tsx`). When 05-08's orphan-manager check redirects to `/dashboard?notice=orphan-manager`, the banner created here will surface to the user. The end-to-end UX (manager hits /gestor → orphan check redirects → dashboard banner displays) is fully wired on this side.

## Self-Check: PASSED

**Files (verified via filesystem):**
- middleware.ts — present, contains all 4 changes
- src/app/dashboard/page.tsx — present, banner + nav link in place
- src/middleware.test.ts — present, 9 passing tests, 0 it.todo
- .planning/phases/05-b2b-institution-manager/05-06-SUMMARY.md — present (this file)

**Commits (verified via `git log`):**
- fe9f50a — present in branch history
- 5cdbec1 — present in branch history
- 9aa9457 — present in branch history
