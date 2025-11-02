# Gestao de Incidentes - Plataforma & LP

Plataforma Next.js que serve de base para o produto "Gestao de Incidentes". A Etapa 0 cobre o bootstrapping do monorepo web, integracao com Supabase Auth, observabilidade com Sentry e automacoes de CI/CD. A Etapa 1 adiciona a landing page comercial completa e o funil de captacao institucional.

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

Ajuste os valores em `.env.local` (modelo em `.env.example`). Caso nao utilize Sentry ou checkout, deixe as variaveis vazias ou remova-as.

| Variavel | Descricao |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon do Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Opcional, usado para tarefas administrativas. |
| `SUPABASE_JWT_SECRET` | Opcional, necessario para webhooks/verificacao. |
| `NEXT_PUBLIC_APP_URL` | URL publica da aplicacao (ex: `https://demo.vercel.app`). |
| `NEXT_PUBLIC_CHECKOUT_URL_ESSENCIAL` | URL do checkout para o plano Essencial (opcional). |
| `NEXT_PUBLIC_CHECKOUT_URL_PRO` | URL do checkout para o plano Pro (opcional). |
| `NEXT_PUBLIC_CHECKOUT_URL_INSTITUCIONAL` | URL do formulario externo ou CRM para atendimento institucional (opcional). |
| `SENTRY_DSN` | DSN do projeto Sentry. Deixe vazio para desativar. |
| `SENTRY_ENVIRONMENT` | Nome do ambiente (ex: `homolog`). |
| `LOG_LEVEL` | Nivel minimo de log (`debug`, `info`, `warn`, `error`). |
| `APP_VERSION` | Versao exibida na rota `/health`. |

## Migracoes do banco

1. Abra o SQL Editor do projeto Supabase ou utilize `supabase cli`.
2. Rode o conteudo de `supabase/migrations/0001_initial_schema.sql`.
3. Verifique se as tabelas e enums foram criados conforme esperado.

## Autenticacao de teste

- Com as configuracoes acima, acesse `/login` e autentique com um usuario criado via Supabase Auth (email/senha).
- Rotas sob `/dashboard` sao protegidas. O middleware redireciona usuarios nao autenticados para `/login` mantendo o parametro `redirectTo`.

## Scripts principais

| Comando | Descricao |
| --- | --- |
| `npm run dev` | Desenvolvimento (http://localhost:3000). |
| `npm run lint` | Executa `next lint`. |
| `npm run test` | Roda testes unitarios (Vitest). |
| `npm run build` | Gera build de producao. |
| `npm run start` | Sobe o build gerado. |
| `npm run typecheck` | Checagem de tipos sem emitir codigo. |

## Rota de saude

`GET /health` responde com JSON contendo `status`, `uptime`, `timestamp` e `version` (valor de `APP_VERSION`). Rota marcada como `dynamic` para evitar cache.

## Observabilidade

- Configuracoes do Sentry em `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`.
- `instrumentation.ts` integra `captureRequestError` com o lifecycle do Next.
- Logger minimalista em `src/lib/logger.ts` respeitando `LOG_LEVEL`.

## CI/CD

Workflow GitHub Actions em `.github/workflows/ci.yml` valida cada push/PR (`npm install`, `npm run lint`, `npm run test`, `npm run build`). Em Vercel configure variaveis equivalentes e selecione Node 20.

## Deploy sugerido

1. **Supabase**: criar projeto, aplicar migracoes, configurar autenticacao email/senha.
2. **Vercel**: importar repositorio, definir `ROOT DIRECTORY = app`, usar build `npm run build` e install `npm install`. Configure as variaveis de ambiente.
3. Defina `NEXT_PUBLIC_APP_URL` com a URL de homolog para alinhar metadata e health check.

## Estrutura de pastas

```
app/
 +- src/
     +- app/             # Rotas App Router (login, dashboard, health, landing)
     +- components/      # Componentes reutilizaveis
     +- lib/             # Helpers (env, logger, schemas, supabase clients)
 +- supabase/            # Migracoes SQL
 +- .github/workflows/   # Pipelines CI
 +- sentry.*.config.ts   # Configuracao Sentry
 +- middleware.ts        # Protecao de rotas via Supabase
```

## Etapa 0: entregaveis

- Autenticacao basica funcionando (login/logout com Supabase).
- Rota `/health` ativa.
- Observabilidade configurada (Sentry + logger).
- CI/CD rodando via GitHub Actions.
- Testes unitarios minimos (`src/lib/env.test.ts`).
- Migracoes iniciais em `supabase/migrations/0001_initial_schema.sql`.

## Etapa 1: landing page comercial

- Home (`/`) redesenhada com 11 secoes (hero, publico-alvo, resultados, metodologia, conteudo, materiais, prova social, planos, garantia, FAQ e CTA final).
- Componentizacao em `src/components/marketing` e conteudo centralizado em `src/lib/marketing/content.ts`.
- Formulario institucional validado com Zod e server action (`submitInstitutionalLead`) gravando leads em `public.institutional_leads`.
- Design system atualizado: fonte Inter, tokens globais e secoes responsivas com CTAs destacados.
- Variaveis `NEXT_PUBLIC_CHECKOUT_URL_*` para mapear links de checkout com fallback seguro quando ausentes.

Documentos complementares estao em `docs/` (checklist, changelog, instrucoes de teste e status de deploy).
