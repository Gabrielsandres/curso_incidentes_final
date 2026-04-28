---
phase: 01-foundation
plan: "02"
subsystem: certificates, auth
tags: [timezone-fix, profile-guardrail, tdd, admin-client]
dependency_graph:
  requires: []
  provides:
    - formatCertificateDate exported with America/Sao_Paulo timezone
    - ensureProfileExists guardrail using admin client
    - dashboard RSC wired to fire guardrail on every authenticated entry
  affects:
    - src/lib/certificates/pdf.ts
    - src/lib/auth/profiles.ts
    - src/app/dashboard/page.tsx
tech_stack:
  added: []
  patterns:
    - Intl.DateTimeFormat with explicit timeZone (America/Sao_Paulo) — deterministic regardless of host TZ
    - Admin client (createSupabaseAdminClient) for RLS-bypassing profile insert
    - fire-and-forget (void) pattern for non-blocking guardrail in RSC render path
key_files:
  created:
    - src/lib/certificates/pdf.test.ts
    - src/lib/auth/profiles.test.ts
  modified:
    - src/lib/certificates/pdf.ts
    - src/lib/auth/profiles.ts
    - src/app/dashboard/page.tsx
decisions:
  - "D-14: ensureProfileExists uses admin client to bypass RLS — justified because this runs post-signup on behalf of the newly authenticated user whose session JWT may not be available"
  - "D-15: formatCertificateDate timezone changed to America/Sao_Paulo — Brazilian users completing a course after 21:00 local time were receiving a certificate dated the next day (UTC)"
  - "Wave coordination (01-01 parallel): captureMessage from observability/sentry deferred to post-merge — profiles.ts uses logger only with TODO comment; test adapted accordingly"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
  tests_added: 5
---

# Phase 1 Plan 2: Timezone Fix + Profile Existence Guardrail Summary

**One-liner:** Correção do fuso horário em certificados (UTC → America/Sao_Paulo) e guardrail de existência de perfil via cliente admin com testes TDD completos.

## What Was Built

**Task 1 — formatCertificateDate timezone fix (OPS-02, D-15)**

A função `formatCertificateDate` em `src/lib/certificates/pdf.ts` usava `timeZone: "UTC"`, causando datas erradas para usuários brasileiros que completavam cursos após as 21:00 horário local (o timestamp UTC já caia no dia seguinte). A correção muda para `timeZone: "America/Sao_Paulo"` e exporta a função para que possa ser testada unitariamente.

Teste crítico: `new Date("2026-04-27T02:00:00Z")` (02:00 UTC = 23:00 no dia anterior em SP) deve retornar `"26/04/2026"`, não `"27/04/2026"`.

**Task 2 — ensureProfileExists guardrail (D-14)**

A função `ensureProfileExists` foi adicionada ao final de `src/lib/auth/profiles.ts`. Usa o cliente admin (bypassa RLS) para verificar se existe uma linha na tabela `profiles` para o `userId` fornecido. Se não existir (trigger de auth falhou silenciosamente), insere uma linha de fallback com `role: "student"` e registra via `logger.warn`. Erros de leitura ou inserção são capturados e logados sem propagar a exceção.

O chamador em `src/app/dashboard/page.tsx` usa `void ensureProfileExists(user.id)` (fire-and-forget) imediatamente após o redirect check, antes de `fetchUserRole` — assim o guardrail dispara em todo request autenticado sem bloquear o render do RSC.

## Test Results

| File | Tests | Status |
|------|-------|--------|
| src/lib/certificates/pdf.test.ts | 2 | PASS |
| src/lib/auth/profiles.test.ts | 3 | PASS |
| **Total** | **5** | **GREEN** |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `0bb4b81` | feat(01-02): fix formatCertificateDate timezone + export + add pdf.test.ts |
| 2 | `debcf05` | feat(01-02): add ensureProfileExists guardrail + wire dashboard call site |

## Deviations from Plan

### Wave Coordination Deviation

**[Rule 3 - Blocking Issue] captureMessage import deferred — sentry.ts not yet in worktree**

- **Found during:** Task 2 (TDD GREEN step)
- **Issue:** `src/lib/observability/sentry.ts` is created by plan 01-01 running in parallel in a separate worktree. Importing it from `profiles.ts` would cause a TypeScript/lint error in this worktree because the file doesn't exist yet.
- **Fix:** Per the wave coordination note (option a), `profiles.ts` uses `logger` only with a `// TODO(01-01 merge):` comment. The test for `captureMessage` call was adapted — test asserts insert behavior only, not the Sentry breadcrumb. After wave merge, the orchestrator can add the import and captureMessage call.
- **Files modified:** `src/lib/auth/profiles.ts`, `src/lib/auth/profiles.test.ts`
- **Impact:** The Sentry breadcrumb for `auth_profile_trigger_gap_detected` will not fire until after wave 1 merge. The logger.warn still emits to stdout. Functional behavior (insert guardrail) is fully implemented and tested.

## Known Stubs

None — all implementations are fully wired. The `captureMessage` deferral is a wave coordination decision, not a stub; the logger.warn covers the observability requirement until merge.

## Threat Flags

No new threat surface introduced beyond what was documented in the plan's threat model.

- T4 (Information Disclosure): `ensureProfileExists` passes only `{ userId }` to logger/Sentry — no email, tokens, or PII beyond internal UUID.
- T5 (DoS/Data Integrity): Concurrent calls handled gracefully — `insertError` is caught and logged; no crash on PK constraint violation.

## Self-Check: PASSED

All created files exist on disk. Both task commits (`0bb4b81`, `debcf05`) confirmed in git log. All 5 tests green. Typecheck and lint exit 0.
