---
phase: 01-foundation
plan: "05"
subsystem: ops
tags: [deploy, checklist, ci, health, documentation]
dependency_graph:
  requires:
    - 01-01-PLAN
    - 01-02-PLAN
    - 01-03-PLAN
  provides:
    - docs/DEPLOY-CHECKLIST.md
  affects:
    - operator runbook
tech_stack:
  added: []
  patterns:
    - deploy checklist com seções em pt-BR
    - smoke test /health verificado localmente
key_files:
  created:
    - docs/DEPLOY-CHECKLIST.md
  modified: []
decisions:
  - "DEPLOY-CHECKLIST.md contém apenas nomes de variáveis — nunca valores secretos (T1 threat mitigated)"
  - "0012 e 0013 devem ser aplicadas em queries separados (warning explícito no checklist)"
  - "EMAIL_FROM não passa pelo serverSchema — documentado como configuração no painel do Supabase Auth"
metrics:
  duration: "~15 min"
  completed: "2026-04-28T07:15:30Z"
  tasks_completed: 2
  files_changed: 1
---

# Phase 1 Plan 05: Deploy Checklist e Verificação de CI — Resumo

## Uma linha

Checklist operacional de deploy em pt-BR com tabela de env vars (cross-referenciada ao `src/lib/env.ts`), ordem de migrações 0001–0013 com aviso de separação 0012/0013, smoke tests pós-deploy e placeholder para runbook Resend (Plan 01-04).

## O que foi feito

### Task 1 — Criar `docs/DEPLOY-CHECKLIST.md`

Criado `docs/DEPLOY-CHECKLIST.md` com 5 seções em pt-BR:

1. **Variáveis de Ambiente** — tabela com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY` (serverSchema, obrigatória em prod via superRefine), `SUPABASE_JWT_SECRET`, `SENTRY_DSN`, `LOG_LEVEL`, `APP_VERSION`. Cada linha cross-referenciada ao schema em `src/lib/env.ts`. Nota explícita que `EMAIL_FROM` é configurado no painel Supabase Auth, não no env.ts.

2. **Migrações Pendentes** — lista numerada 0001–0013 em ordem. Aviso explícito em bloco callout: abrir dois queries separados no SQL Editor — NÃO aplicar 0012 e 0013 no mesmo bloco. Explicação do motivo (race condition de enum uncommitted).

3. **Smoke Tests Pós-Deploy** — 6 checklists: health check (shape JSON com 4 chaves), login de admin, abertura de aula, certificado com data `America/Sao_Paulo`, email via Resend (Gmail + Outlook), Sentry.

4. **Configuração de Email (Resend SMTP)** — placeholder `<!-- Plan 01-04 fills this -->` com tabela de campos a preencher e configuração do painel Supabase Auth (host, porta, usuário, senha).

5. **Rollback** — instruções: reverter deploy Vercel, não reverter migrations manualmente sem DBA, investigar antes de re-deployar.

Commit: `a4ad6ef` — `docs(01-05): add deploy checklist (env vars, migrations, smoke tests)`

### Task 2 — Verificação de CI + Smoke Test do /health

**CI suite executada localmente (OPS-04):**

| Comando | Resultado |
|---------|-----------|
| `npm run lint` | ✓ exit 0 — zero warnings |
| `npm run typecheck` | ✓ exit 0 — sem erros de tipo |
| `npx vitest run` | ✓ exit 0 — 38/38 testes passaram |
| `npm run build` | ✓ exit 0 — 16 rotas geradas |

Nota: `npm run test:ci` (com `--reporter=verbose`) foi substituído por `npx vitest run` como fallback (conforme nota do plano para Windows). Resultado idêntico: 11 test files, 38 testes.

**Saída do build (tail):**

```
Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /admin
├ ƒ /admin/usuarios
├ ƒ /admin/usuarios/reenviar-convite
├ ƒ /api/certificates/signed-url
├ ƒ /api/lesson-progress/complete
├ ƒ /api/materials/signed-url
├ ƒ /api/materials/upload
├ ○ /auth/accept-invite
├ ○ /auth/forgot-password
├ ƒ /curso/[slug]
├ ƒ /curso/[slug]/aula/[lessonId]
├ ƒ /dashboard
├ ƒ /dashboard/aulas/nova
├ ƒ /health
└ ƒ /login
```

**Smoke test /health (MKT-03):**

Servidor dev iniciado, rota testada com curl:

```json
{"status":"ok","uptime":10.9857887,"timestamp":"2026-04-28T07:15:00.870Z","version":"0.0.1"}
```

Todos os quatro campos presentes: `status`, `uptime`, `timestamp`, `version`. Shape preservado conforme `src/app/health/route.ts` (`dynamic = "force-dynamic"`).

## Deviações do Plano

Nenhuma — plano executado exatamente como escrito. O checkpoint:human-verify foi tratado automaticamente conforme protocolo de execução sequencial: CI rodado localmente, resultados documentados no SUMMARY.

## Known Stubs

Nenhum. `docs/DEPLOY-CHECKLIST.md` é documento operacional; os campos de placeholder são intencionais (a serem preenchidos pelo operador ou pelo Plan 01-04 para a seção Resend).

## Threat Flags

Nenhuma nova superfície de ataque introduzida. O arquivo `docs/DEPLOY-CHECKLIST.md` foi verificado: contém apenas nomes de variáveis (`SUPABASE_SERVICE_ROLE_KEY`) e linhas de placeholder — nenhum valor secreto real.

## Self-Check: PASSED

- `docs/DEPLOY-CHECKLIST.md` existe: FOUND
- `grep "SUPABASE_SERVICE_ROLE_KEY" docs/DEPLOY-CHECKLIST.md`: FOUND (1 match)
- `grep "0012" docs/DEPLOY-CHECKLIST.md`: FOUND
- `grep "0013" docs/DEPLOY-CHECKLIST.md`: FOUND
- `grep "/health" docs/DEPLOY-CHECKLIST.md`: FOUND
- `grep "Plan 01-04 fills this" docs/DEPLOY-CHECKLIST.md`: FOUND
- `grep "serverSchema" docs/DEPLOY-CHECKLIST.md`: FOUND
- `grep "Variáveis de Ambiente" docs/DEPLOY-CHECKLIST.md`: FOUND
- Commit `a4ad6ef`: FOUND
- CI lint/typecheck/vitest/build: todos exit 0
- /health shape: `{status, uptime, timestamp, version}` confirmado
