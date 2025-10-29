# Etapa 0 – Checklist de Aceite

| Item | Status | Observacoes |
| --- | --- | --- |
| Repositorio Next.js configurado com TS/Tailwind | Concluido | Projeto `app/` criado com Next 16 + Tailwind e alias `@/`. |
| Autenticacao Supabase (login/logout) | Concluido | /login utiliza Supabase Auth com middleware protegendo /dashboard. |
| Rota `/health` operacional | Concluido | Retorna JSON com status, uptime e version (`APP_VERSION`). |
| Observabilidade (Sentry + logs) | Concluido | Configs em `sentry.*.config.ts` + logger em `src/lib/logger.ts`. |
| Migracoes iniciais aplicaveis | Concluido | `supabase/migrations/0001_initial_schema.sql`. |
| CI/CD configurado | Concluido | Workflow `ci.yml` executa lint, testes e build. |
| Testes minimos | Concluido | Vitest cobrindo validacao de env (`src/lib/env.test.ts`). |
| Deploy de homolog | Pendente | Requer configurar projeto Vercel + variaveis. Guia em `docs/deploy.md`. |
