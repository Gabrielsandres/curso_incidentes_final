# Gestao de Incidentes – Plataforma & LP

Plataforma Next.js que servira de base para o produto "Gestao de Incidentes". Esta etapa (Etapa 0) cobre bootstrapping do monorepo web, integracao com Supabase Auth, observabilidade com Sentry e automacoes de CI/CD.

## Arquitetura

- **Frontend**: Next.js 16 (App Router) com TypeScript e Tailwind.
- **Autenticacao**: Supabase Auth com cookies e middleware protegendo rotas.
- **Banco**: Supabase Postgres (migracoes manuais em `supabase/migrations`).
- **Observabilidade**: Sentry para erros/performance + logger basico.
- **Hospedagem sugerida**: Vercel (frontend) e Supabase (DB/Auth/Storage).

## Requisitos de ambiente

1. Node.js >= 20 e npm.
2. Conta Supabase com projeto provisionado.
3. Conta Sentry (opcional, mas recomendada).

## Variaveis de ambiente

Copie `.env.example` para `.env.local` e ajuste os valores:

```
cp .env.example .env.local
```

| Variavel | Descricao |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional, usado para tarefas administrativas. |
| `SUPABASE_JWT_SECRET` | Opcional, necessario para webhooks/verificacao. |
| `NEXT_PUBLIC_APP_URL` | URL publica da aplicacao (ex: `https://demo.vercel.app`). |
| `SENTRY_DSN` | DSN do projeto Sentry. Deixe vazio para desativar. |
| `SENTRY_ENVIRONMENT` | Nome do ambiente (ex: `homolog`). |
| `LOG_LEVEL` | Nivel minimo de log (`debug`, `info`, `warn`, `error`). |
| `APP_VERSION` | Versao exibida na rota `/health`. |

## Migracoes do banco

1. Abra o SQL Editor do projeto Supabase ou utilize `supabase cli`.
2. Rode o conteudo de `supabase/migrations/0001_initial_schema.sql`.
3. Verifique se as tabelas e enums foram criados conforme esperado.

## Autenticacao de teste

- Com as configuracoes acima, acesse `/login` e autentique com um usuario criado via Supabase Auth (perfis de Email/Password).
- Rotas sob `/dashboard` sao protegidas. Middleware redireciona usuarios nao autenticados para `/login` mantendo o parametro `redirectTo`.

## Scripts principais

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Sobe a aplicacao em desenvolvimento (http://localhost:3000). |
| `npm run lint` | Executa `next lint`. |
| `npm run test` | Roda os testes unitarios (Vitest). |
| `npm run build` | Gera build de producao. |
| `npm run start` | Sobe build compilado. |
| `npm run typecheck` | Rodar checagem de tipos sem emitir codigo. |

## Rota de saude

`GET /health` responde com JSON contendo `status`, `uptime`, `timestamp` e `version` (valor de `APP_VERSION`). Configurado como `dynamic` para garantir que nao seja cacheado.

## Observabilidade

- Configuracoes do Sentry em `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`.
- Arquivo `instrumentation.ts` integra `captureRequestError` com o lifecycle do Next.
- Logger minimalista em `src/lib/logger.ts` respeita `LOG_LEVEL`.

## CI/CD

Workflow GitHub Actions em `.github/workflows/ci.yml` valida cada push/PR (`npm install`, `npm run lint`, `npm run test`, `npm run build`). Em Vercel, configure variaveis de ambiente equivalentes e selecione Node 20.

## Deploy sugerido

1. **Supabase**: criar projeto, aplicar migracoes, configurar autentificacao Email/Password.
2. **Vercel**: importar repositório, definir `ROOT DIRECTORY = app`, usar build `npm run build` e install `npm install`. Aponte `PROJECT SETTINGS > ENVIRONMENT VARIABLES` para os campos indicados.
3. Defina `NEXT_PUBLIC_APP_URL` com a URL de homolog para alinhamento com metadata e health check.

## Estrutura de pastas

```
app/
 +- src/
 ¦   +- app/             # Rotas App Router (login, dashboard, health)
 ¦   +- components/      # Componentes reutilizaveis (formularios, botoes)
 ¦   +- lib/             # Helpers (env, logger, supabase clients)
 +- supabase/            # Migracoes SQL
 +- .github/workflows/   # Pipelines CI
 +- sentry.*.config.ts   # Configuracao Sentry
 +- middleware.ts        # Protecao de rotas via Supabase
```

## Etapa 0: entregaveis

- **Autenticacao** basica funcionando (login/logout com Supabase).
- **Rota `/health`** ativa.
- **Observabilidade** preparada (Sentry + logger).
- **CI/CD** em execucao via GitHub Actions.
- **Testes** unitarios minimos com Vitest (`src/lib/env.test.ts`).
- **Migracoes** iniciais versionadas em `supabase/migrations/0001_initial_schema.sql`.

Documentos complementares estao em `docs/` (checklist, changelog, instrucoes de teste e status do deploy).
