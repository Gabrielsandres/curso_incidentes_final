---
phase: "02-catalog-crud"
plan: "06"
subsystem: "enrollment-grant"
tags: ["enrollment", "admin", "invite", "server-actions", "tdd"]
dependency_graph:
  requires: ["02-01", "02-05"]
  provides: ["ENR-03"]
  affects: ["accept-invite-flow", "admin-cursos-pages"]
tech_stack:
  added: []
  patterns:
    - "auth.admin.listUsers for email-to-profile resolution (profiles table has no email col)"
    - "pending_enrollments + accept-invite conversion pattern"
    - "useActionState multi-step dialog (lookup → grant or invite)"
    - "useCallback to stabilize handlers passed to useEffect deps"
    - "ExpiryToggle as top-level component (not defined inside render)"
key_files:
  created:
    - src/app/actions/grant-enrollment.ts
    - src/app/actions/grant-enrollment.test.ts
    - src/app/actions/manage-pending-enrollment.ts
    - src/app/actions/manage-pending-enrollment.test.ts
    - src/app/actions/revoke-enrollment.ts
    - src/app/admin/cursos/[slug]/alunos/page.tsx
    - src/app/admin/cursos/[slug]/alunos/revoke-enrollment-button.tsx
    - src/components/admin/grant-enrollment-dialog.tsx
  modified:
    - src/app/auth/accept-invite/accept-invite-form.tsx
decisions:
  - "Used auth.admin.listUsers (page=1, perPage=1000) to resolve email→userId because profiles table stores no email column — only auth.users has it"
  - "manage-pending-enrollment also uses listUsers for same reason — profile lookup by email via DB would always return empty"
  - "ExpiryToggle extracted to module-level component to satisfy react-hooks/static-components lint rule"
  - "handleClose wrapped in useCallback to stabilize for useEffect deps arrays"
  - "revokeEnrollmentAction placed in separate file (not inline in page) to keep RSC page server-only"
metrics:
  duration_seconds: 1105
  completed_date: "2026-04-28"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 2 Plan 06: ENR-03 — Admin Grant Enrollment Summary

Admin pode conceder acesso a curso via dialog de 5 estados com busca de email, invite para emails não cadastrados, e conversão automática de pendências no aceite do convite.

## What Was Built

### Server Actions

**`grant-enrollment.ts`** — três server actions:
- `lookupProfileByEmailAction`: busca auth user por email via `auth.admin.listUsers`, depois carrega o perfil pelo ID. Requer role=admin.
- `grantEnrollmentAction`: INSERT em `enrollments` com `source="admin_grant"`; captura 23505 com mensagem pt-BR.
- `grantEnrollmentWithInviteAction`: chama `auth.admin.inviteUserByEmail` + INSERT em `pending_enrollments`. Requer role=admin.

**`manage-pending-enrollment.ts`** — `convertPendingEnrollmentsForEmail(email)`:
- Busca pending_enrollments pelo email
- Resolve profile via `auth.admin.listUsers` (mesma abordagem — profiles sem email)
- Converte cada pending em enrollment real; deleta o pending (inclusive em 23505)
- Erros não-23505 logam e preservam o pending row

**`revoke-enrollment.ts`** — `revokeEnrollmentAction`: requireAdminUser + delete por enrollment.id + revalidatePath.

### accept-invite-form.tsx

Adicionado import + chamada fire-and-forget após `supabase.auth.updateUser` suceder:
```typescript
void convertPendingEnrollmentsForEmail(currentUser.email);
```
Wrapped em try/catch para não bloquear o UX de aceite de convite.

### /admin/cursos/[slug]/alunos/page.tsx

RSC com guard admin, breadcrumb, stats row, tabela de enrollments (com source labels pt-BR, soft limit 200), empty state, e seção de convites pendentes.

### grant-enrollment-dialog.tsx + revoke-enrollment-button.tsx

Dialog com 5 estados via `useActionState`:
- **A/B idle/buscando**: formulário de email + toggle "Sem expiração" + botão "Buscar aluno" com spinner
- **C encontrado**: banner emerald + form de concessão direta
- **D não encontrado**: banner amber + form de convite
- **E já tem acesso**: banner red + botão Fechar
- Auto-close em 2s após sucesso; Esc fecha; overlay click fecha; foco restaurado ao trigger

## Tests

- `grant-enrollment.test.ts`: 12 testes (T1–T12) cobrindo todos os paths dos 3 server actions
- `manage-pending-enrollment.test.ts`: 6 testes cobrindo empty, not-found, single, multi, 23505, non-23505
- Total: 88/88 testes no suite completo passando

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] profiles table has no email column**
- **Found during:** Task 1 (typecheck errors) + Task 2 (semantic bug)
- **Issue:** Plan's PATTERNS.md showed `.from("profiles").select("id, full_name, email").eq("email", ...)` but `profiles` table has columns `id, full_name, role, created_at, updated_at` only — no `email`. Email lives in `auth.users`.
- **Fix:** Both `lookupProfileByEmailAction` and `convertPendingEnrollmentsForEmail` now use `auth.admin.listUsers({page:1, perPage:1000})` to find the auth user by email, then fetch the profile by `id`.
- **Files modified:** `src/app/actions/grant-enrollment.ts`, `src/app/actions/manage-pending-enrollment.ts`, `src/app/actions/grant-enrollment.test.ts`, `src/app/actions/manage-pending-enrollment.test.ts`
- **Commits:** 73dfbae

**2. [Rule 1 - Bug] ExpiryToggle defined inside component body**
- **Found during:** Task 3 lint run
- **Issue:** ESLint `react-hooks/static-components` rejects components defined inside render functions — they reset state on every render.
- **Fix:** Moved `ExpiryToggle` to module level with `noExpiry` and `onToggle` props.
- **Files modified:** `src/components/admin/grant-enrollment-dialog.tsx`
- **Commit:** 73dfbae

**3. [Rule 1 - Bug] handleClose accessed before declaration inside useEffect**
- **Found during:** Task 3 lint run
- **Issue:** `handleClose` function was declared after `useEffect` blocks that referenced it, causing `react-hooks/immutability` error.
- **Fix:** Wrapped `handleClose` in `useCallback` (stable reference) and moved declaration before the `useEffect` hooks.
- **Files modified:** `src/components/admin/grant-enrollment-dialog.tsx`
- **Commit:** 73dfbae

## Known Stubs

None — all data flows are wired. The alunos page uses admin client to fetch real enrollments and pending_enrollments from the database.

## Threat Flags

No new threat surface beyond what the plan's threat model covers. `revokeEnrollmentAction` includes `requireAdminUser` guard (T-06-07 mitigated).

## Self-Check: PASSED

All 9 expected files confirmed present on disk. All 4 task commits confirmed in git log (05efb05, 920206a, 34eeb7a, 73dfbae). 88/88 tests passing. lint: 0 warnings. typecheck: clean.
