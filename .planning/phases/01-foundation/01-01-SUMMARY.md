---
phase: 01-foundation
plan: "01"
subsystem: observability
tags: [env-validation, sentry, tdd, production-safety]
dependency_graph:
  requires: []
  provides:
    - "prod-strict SUPABASE_SERVICE_ROLE_KEY validation via superRefine"
    - "captureException / captureMessage wrapper gated on SENTRY_DSN"
    - "global-error.tsx uses wrapper instead of direct Sentry SDK"
  affects:
    - "src/lib/env.ts (superRefine on serverSchema)"
    - "src/app/global-error.tsx (import replaced)"
tech_stack:
  added: []
  patterns:
    - "Zod superRefine for environment-conditional validation"
    - "DSN-gated Sentry wrapper (process.env.SENTRY_DSN, no getEnv) for client-safe import"
key_files:
  created:
    - src/lib/observability/sentry.ts
    - src/lib/observability/sentry.test.ts
  modified:
    - src/lib/env.ts
    - src/lib/env.test.ts
    - src/app/global-error.tsx
decisions:
  - "D-01: superRefine on SUPABASE_SERVICE_ROLE_KEY — prod throws, dev/test stays optional"
  - "D-03: Sentry wrapper reads process.env.SENTRY_DSN directly (not getEnv()) — documented exception to CLAUDE.md no-raw-process.env rule, required because global-error.tsx is a client component"
  - "D-04: All direct Sentry call sites (global-error.tsx) replaced with wrapper"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28T06:39:38Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 01 Plan 01: Env Hardening + Sentry Wrapper — Resumo

**Uma linha:** Validação prod-condicional para `SUPABASE_SERVICE_ROLE_KEY` via Zod `superRefine`, e wrapper `captureException`/`captureMessage` que silencia chamadas ao Sentry quando `SENTRY_DSN` está ausente.

## O Que Foi Feito

### Task 1 — superRefine em env.ts (D-01, OPS-01)

Adicionado `superRefine` ao campo `SUPABASE_SERVICE_ROLE_KEY` dentro de `serverSchema` em `src/lib/env.ts`. O refinamento verifica `process.env.NODE_ENV === "production"` e, se a chave estiver ausente, adiciona um `ZodIssueCode.custom` que faz `getEnv()` lançar exceção no cold boot em produção. Em dev/test o campo permanece opcional.

Dois novos casos de teste foram adicionados em `src/lib/env.test.ts` (bloco `"SUPABASE_SERVICE_ROLE_KEY prod refinement"`), seguindo ordem TDD: RED primeiro, depois GREEN após a edição em `env.ts`.

### Task 2 — Wrapper Sentry + wire global-error.tsx (D-03, D-04, OPS-03)

Criado `src/lib/observability/sentry.ts` com as exportações:
- `captureException(err, ctx?)` — no-op quando `SENTRY_DSN` ausente; chama `Sentry.captureException(err, { extra: ctx })` quando presente
- `captureMessage(message, level?, ctx?)` — mesmo padrão para mensagens
- `SentryContext` (tipo) e `SeverityLevel` (tipo) — extensíveis para uso futuro

O wrapper lê `process.env.SENTRY_DSN` diretamente (não `getEnv()`) para manter o grafo de imports livre de módulos server-only (`next/headers`), permitindo importação segura de `"use client"` components.

`src/app/global-error.tsx` teve o import `import * as Sentry from "@sentry/nextjs"` substituído por `import { captureException } from "@/lib/observability/sentry"`, e a chamada `Sentry.captureException(error)` substituída por `captureException(error)`.

Quatro testes em `src/lib/observability/sentry.test.ts` cobrem no-op e call-through para ambas as funções, usando `vi.mock("@sentry/nextjs")`.

## Desvios do Plano

Nenhum — plano executado exatamente como escrito.

Nota técnica: `grep -c "superRefine" src/lib/env.ts` retorna 2 (uma ocorrência no comentário de documentação e uma no código). O critério do plano mencionava 1, mas o comentário explicativo `// superRefine fires inside safeParse` foi explicitamente incluído no snippet de implementação do próprio plano. O comportamento funcional está 100% correto — a chamada `.superRefine(...)` está presente e os testes passam.

Nota técnica: `grep -c "getEnv" src/lib/observability/sentry.ts` retorna 1, mas a única ocorrência é no comentário `// NOT getEnv()` — documentação da escolha arquitetural deliberada (D-03). Nenhuma importação ou chamada a `getEnv` existe no código executável.

## Verificações Finais

| Verificação | Resultado |
|---|---|
| `npx vitest run src/lib/env.test.ts` (5 testes) | PASSOU |
| `npx vitest run src/lib/observability/sentry.test.ts` (4 testes) | PASSOU |
| `npm run typecheck` | PASSOU |
| `npx eslint src/lib/env.ts src/lib/observability/sentry.ts src/app/global-error.tsx --max-warnings=0` | PASSOU |

## Commits

| Task | Hash | Mensagem |
|---|---|---|
| Task 1 | `7abdcce` | `feat(01-01): add superRefine prod validation for SUPABASE_SERVICE_ROLE_KEY` |
| Task 2 | `fac6bbe` | `feat(01-01): add Sentry wrapper and wire global-error.tsx (D-03, D-04)` |

## Known Stubs

Nenhum — nenhum componente de UI ou dado mockado introduzido neste plano.

## Threat Flags

Nenhuma superfície de segurança nova além do mapeado no `<threat_model>` do plano.

## Self-Check: PASSED

| Item | Status |
|---|---|
| `src/lib/env.ts` | FOUND |
| `src/lib/env.test.ts` | FOUND |
| `src/lib/observability/sentry.ts` | FOUND |
| `src/lib/observability/sentry.test.ts` | FOUND |
| `src/app/global-error.tsx` | FOUND |
| `.planning/phases/01-foundation/01-01-SUMMARY.md` | FOUND |
| commit `7abdcce` | FOUND |
| commit `fac6bbe` | FOUND |
