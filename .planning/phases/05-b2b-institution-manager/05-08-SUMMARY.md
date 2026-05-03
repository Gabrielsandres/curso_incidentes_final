---
phase: 05-b2b-institution-manager
plan: 08
subsystem: manager-dashboard
tags: [manager-dashboard, rsc, suspense, matrix-table, sticky-column, pt-BR]
requirements: [INST-06, INST-07]
provides:
  - "/gestor (singular per D-03) RSC dashboard composing hero + Suspense<ProgressMatrix> + InstitutionCertificatesTable"
  - "Defense-in-depth role guard (admin → /admin/instituicoes; non-manager → /dashboard) at page level"
  - "Orphan-manager redirect to /dashboard?notice=orphan-manager (D-02 + Pitfall 1) consumed by 05-06 banner"
  - "ProgressMatrix HTML <table> with sticky left student column + 3-state cells (active / 100% emerald / expired muted+pill)"
  - "InstitutionCertificatesTable read-only with font-mono select-all code, no download link (D-15)"
  - "MdheContactCard reusable empty-state contact block (Mail + Phone lucide icons)"
  - "3 progressive empty states wired (D-13)"
requires:
  - "src/lib/institutions/queries.ts getInstitutionForManager + getInstitutionMembersWithProgress + getInstitutionCertificates (built in 05-03)"
  - "src/lib/institutions/types.ts MatrixCell + InstitutionMemberWithProgress + InstitutionCertificateRow"
  - "src/lib/auth/profiles.ts ensureProfileExists (single-arg signature; B-2 fix)"
  - "src/lib/auth/roles.ts fetchUserRole"
  - "src/lib/supabase/admin.ts createSupabaseAdminClient (D-12 documented bypass)"
  - "src/lib/supabase/server.ts createSupabaseServerClient (RLS-respecting orphan resolve)"
  - "src/components/auth/logout-button.tsx LogoutButton"
  - "middleware.ts /gestor route ring (built in 05-06)"
  - "src/app/dashboard/page.tsx orphan-manager flash banner (built in 05-06)"
affects:
  - "Plan 05-09 (UAT) — manager-facing E2E scenarios are now executable; orphan path verifiable"
  - "End-user surface: institution_manager role users now have a fully-rendered dashboard"
tech-stack:
  added:
    - "lucide-react Building2 + Mail + Phone icons (already in package.json)"
  patterns:
    - "Suspense-wrapped data leg below an unblocked hero card (UI-SPEC §Loading states)"
    - "HTML <table> with sticky-left first column over CSS grid (UI-SPEC §Matrix table)"
    - "Server-side institution_id resolved from authenticated user.id only — no slug/id in URL (D-03)"
    - "Defense-in-depth role check duplicating middleware logic (preserved admin-redirect symmetry)"
    - "Documented admin client bypass with explicit institution_id filter (D-12; queries built in 05-03)"
key-files:
  created:
    - "src/app/gestor/layout.tsx (18 lines)"
    - "src/app/gestor/page.tsx (113 lines)"
    - "src/app/gestor/progress-matrix.tsx (146 lines)"
    - "src/app/gestor/institution-certificates-table.tsx (83 lines)"
    - "src/components/marketing/mdhe-contact-card.tsx (45 lines)"
    - ".planning/phases/05-b2b-institution-manager/05-08-SUMMARY.md"
  modified: []
decisions:
  - "Layout subtitle uses simple 'Painel da instituição' (no name interpolation) since layout.tsx has no access to the resolved profile — UI-SPEC's 'Olá, {nome}' moves to the page-level hero card (documented in plan §Sub-step B note)"
  - "ProgressMatrix sorts members by full_name and courses by title using locale 'pt-BR' for stable ordering"
  - "Course-header truncate at max-w-[160px] with title attr for full-name on hover (UI-SPEC §Copywriting Contract line 233)"
  - "MdheContactCard placeholder values shipped with explicit TODO disclosure copy (UI-SPEC §MDHE contact card line 220 deferred to project owner)"
metrics:
  duration: "~5 min"
  completed: 2026-05-03
  tasks: 2
  files_created: 5
  files_modified: 0
---

# Phase 5 Plan 8: Manager Dashboard `/gestor` Summary

INST-06 + INST-07 delivered: 5 new files compose the manager-facing `/gestor` RSC dashboard with hero card, Suspense-wrapped progress matrix (sticky-left student column, 3-state cells), and read-only certificates table; orphan-manager redirect wired; D-12 admin-client bypass and D-15 plain-text codes preserved.

## What Was Built

### 1. `src/app/gestor/layout.tsx` (18 lines)

Minimal manager-tone header: brand `Gestão de Incidentes` + subline `Painel da instituição` + `LogoutButton`. Mirrors `/dashboard` shell but without student-progress widgets.

### 2. `src/app/gestor/page.tsx` (113 lines)

RSC entry point. Auth flow:

1. `createSupabaseServerClient` → `getUser()` (defensive `/login?redirectTo=/gestor` if absent — middleware already gates).
2. `fetchUserRole(supabase, user.id)` → `admin` redirected to `/admin/instituicoes`; non-manager redirected to `/dashboard` (defense-in-depth duplicates middleware logic).
3. `void ensureProfileExists(user.id);` — **single-arg form** (B-2 fix preserved; analog: `src/app/dashboard/page.tsx:43`).
4. `getInstitutionForManager(supabase, user.id)` (RLS-respecting). `null` → `redirect("/dashboard?notice=orphan-manager")` (consumed by 05-06 banner).
5. Lookup own `profiles.full_name` for the hero greeting.
6. Render hero (`Building2` icon + institution name + greeting), `Suspense<ProgressMatrix institutionId={inst.id} />` with skeleton fallback, then `InstitutionCertificatesTable`.

### 3. `src/app/gestor/progress-matrix.tsx` (146 lines)

HTML `<table>` per UI-SPEC §Matrix table. Key Tailwind:

- Wrapper `overflow-x-auto rounded-2xl border border-slate-200 bg-white`
- Table `w-full min-w-[640px] text-sm`
- First col header & row-header `sticky left-0 z-10 bg-{slate-50|white}` for non-scrolling student name
- Course headers truncate at `max-w-[160px]` with `title` attr

`ProgressCell` renders 4 visual states:

| Branch                         | percent class                                    | sub-line class       | extras                |
| ------------------------------ | ------------------------------------------------ | -------------------- | --------------------- |
| no enrollment (`cell == null`) | `text-slate-300` em-dash                         | —                    | —                     |
| 100% complete                  | `text-sm font-semibold text-emerald-700`         | `text-xs text-slate-500` | —                 |
| active progress                | `text-sm font-semibold text-slate-900`           | `text-xs text-slate-500` | —                 |
| expired                        | `text-sm text-slate-400` (no semibold; muted)    | `text-xs text-slate-400` | `Expirado` pill   |

Empty states (D-13):

- 0 members → `"Nenhum aluno vinculado ainda"` heading + `MdheContactCard` inline.
- 0 distinct courses across members → `"Sua equipe ainda não tem acesso a nenhum curso"` ("Aguarde a MDHE…").

Member rows sorted by `fullName.localeCompare(b.fullName, "pt-BR")`; course columns sorted by title with same locale.

### 4. `src/app/gestor/institution-certificates-table.tsx` (83 lines)

Read-only table; columns Aluno · Curso · Data de emissão · Código. Code rendered with `font-mono text-xs text-slate-700 select-all` (D-15: no link, no download attribute). Date formatted via `toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", … })`. Empty state: `"Nenhum certificado emitido ainda"` (D-13).

### 5. `src/components/marketing/mdhe-contact-card.tsx` (45 lines)

Reusable `MdheContactCard` exporting a `rounded-2xl border border-slate-200 bg-white p-6` block with `Mail` + `Phone` lucide icons (size 14, `text-slate-400`) and placeholder mailto/wa.me links. Includes explicit TODO disclosure copy ("Os contatos acima são placeholders…") per UI-SPEC line 220.

## Verification Results

| Gate                    | Result                                              |
| ----------------------- | --------------------------------------------------- |
| `npm run typecheck`     | ✅ exit 0                                            |
| `npm run lint`          | ✅ exit 0 (zero warnings)                            |
| `npm run test:ci`       | ✅ 207/207 passed (29 files)                         |
| `npm run build`         | ✅ build succeeds; `/gestor` registered as `ƒ` route |
| Acceptance criteria T1  | ✅ all 9 grep guards pass (incl. B-2 single-arg)     |
| Acceptance criteria T2  | ✅ all 13 grep guards pass (incl. D-15 no-download)  |

B-2 fix grep guards (verified):

```
grep -qF 'void ensureProfileExists(user.id);' src/app/gestor/page.tsx  → match
grep -qE 'ensureProfileExists\(user\.id, '   src/app/gestor/page.tsx  → no match
```

## Commits

| # | Task | Hash      | Files                                                                              |
| - | ---- | --------- | ---------------------------------------------------------------------------------- |
| 1 | T1   | `9dfc0ec` | `src/app/gestor/layout.tsx`, `src/app/gestor/page.tsx`, `src/components/marketing/mdhe-contact-card.tsx` |
| 2 | T2   | `b6728f3` | `src/app/gestor/progress-matrix.tsx`, `src/app/gestor/institution-certificates-table.tsx`               |

**Per-task verify sequencing note:** Task 1's `page.tsx` imports `./progress-matrix` and `./institution-certificates-table` (both built in Task 2). Running `npm run typecheck` after Task 1's commit alone surfaces 2 transient `TS2307` errors that resolve at Task 2's commit. The Task 2 verify gate (`typecheck && lint && test:ci && build`) was the only invocation that could pass cleanly given the import dependency, and all 4 sub-gates passed at Task 2's commit. This is structural to the plan as written — not a deviation.

## Threat Model Compliance

| Threat ID | Disposition | Verification |
|-----------|-------------|--------------|
| T-05-08-01 (manager B sees inst A via param tampering) | mitigate | `/gestor` URL has no slug/id; `getInstitutionForManager(supabase, user.id)` resolves institution from `auth.uid()` only via RLS-respecting server client (verified by reading queries.ts) |
| T-05-08-02 (admin-bypass leaks across institutions) | mitigate | Both bypass functions inherit `BYPASS JUSTIFICATION` blocks + explicit `.eq("institution_id", institutionId)` filter (queries.ts lines 130, 299; verified during 05-03) |
| T-05-08-03 (orphan manager sees stale dashboard) | mitigate | `if (!inst) redirect("/dashboard?notice=orphan-manager")` — verified at page.tsx line 67 |
| T-05-08-04 (expired enrollments visible — privacy) | accept | Intentional per ENR-04 + D-12; rendered in muted style with `Expirado` pill |
| T-05-08-05 (cert code reuse) | accept | Codes are public-by-design; manager visibility ≡ alumni PDF |
| T-05-08-06 (skeleton reveals data shape) | accept | Skeleton always renders 3 rows × 4 cols regardless of real count |
| T-05-08-07 (heavy join on every nav) | accept | Suspense defers slow leg; 5-batched-queries contract from 05-03 |

## Deviations from Plan

None — plan executed exactly as written.

(One minor note: the plan's reference comment `mirror dashboard pattern at src/app/dashboard/page.tsx:37` was updated to `:43` in the implementation because the actual `void ensureProfileExists` call lives at line 43 in the current dashboard file, not 37. This is a comment-only correction with no behavioral impact.)

## Threat Flags

None — no new security-relevant surface introduced beyond what was modeled in the plan's `<threat_model>`. The `/gestor` route surface, admin-client query paths, and certificate-code display all match the threat register.

## Known Stubs

None. All data sources are wired; the empty states are intentional UX (not stubs) and surface real query results.

The MdheContactCard ships with explicit-placeholder values + visible TODO disclosure copy, which is documented behavior per UI-SPEC line 220 (project-owner-confirmed values land via a single edit before release).

## Self-Check: PASSED

Files exist:
- ✅ `src/app/gestor/layout.tsx`
- ✅ `src/app/gestor/page.tsx`
- ✅ `src/app/gestor/progress-matrix.tsx`
- ✅ `src/app/gestor/institution-certificates-table.tsx`
- ✅ `src/components/marketing/mdhe-contact-card.tsx`

Commits exist:
- ✅ `9dfc0ec` (Task 1)
- ✅ `b6728f3` (Task 2)

Verification gates:
- ✅ typecheck exit 0
- ✅ lint exit 0 (zero warnings)
- ✅ test:ci 207/207
- ✅ build success; `/gestor` route registered

This plan UNBLOCKS the UAT scenarios in plan 05-09 (manager-facing E2E).
