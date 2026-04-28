# Plataforma MDHE — Gestão de Incidentes

## What This Is

Plataforma proprietária de cursos online da **MDHE Consultoria e Assessoria**, especializada em segurança escolar (gestão de incidentes, avaliação de ameaças, planos de evacuação e lockdown). Atende dois fluxos de aluno — **B2C** (profissional da educação que compra individualmente) e **B2B** (escola/instituição que contrata e libera acesso para sua equipe), com landing comercial, player de aulas, materiais para download, certificados automáticos e área administrativa para a MDHE operar tudo sem SQL.

## Core Value

**Um aluno (B2C ou B2B) consegue concluir um curso da MDHE — assistir todas as aulas, baixar os materiais, e receber o certificado em PDF — sem fricção operacional para a MDHE.** Esse é o ciclo que precisa funcionar antes de qualquer redesign ou expansão de catálogo.

## Requirements

### Validated

<!-- Inferidos do codebase já existente. Já em produção/funcionando. -->

- ✓ Auth Supabase (login email/senha, esqueci senha, confirmação por email, aceitar convite) — existing
- ✓ Middleware com 3 anéis: rotas públicas, protegidas (`/dashboard`, `/curso`), e admin-only (`/admin`, `/dashboard/aulas`) — existing
- ✓ Player de aulas autenticado (`/curso/[slug]/aula/[lessonId]`) com marcação de aula concluída via `/api/lesson-progress/complete` — existing
- ✓ Upload + download protegido de materiais por aula (signed URLs via `/api/materials/upload` e `/api/materials/signed-url`) — existing
- ✓ Landing comercial pt-BR com 11 seções e formulário institucional gravando em `institutional_leads` via service-role — existing
- ✓ Admin: criação de aula (`/dashboard/aulas/nova`), gestão de usuários (`/admin/usuarios`), reenvio de convite — existing
- ✓ Migrações SQL versionadas (0001..0011) com RLS, profiles, roles e tabelas de cursos/certificados — existing

### Active

<!-- Hipóteses de v1. Validadas quando shipadas. -->

**Conteúdo & catálogo**
- [ ] Admin gerencia múltiplos cursos sem SQL: CRUD de curso, módulos, aulas e materiais
- [ ] Aulas usam YouTube unlisted no ambiente de dev (não vão para prod com YouTube)

**Aluno (player)**
- [ ] Aluno enxerga progresso por curso (% concluído) no dashboard
- [ ] Aluno recebe certificado em PDF automaticamente quando marca 100% das aulas como concluídas
- [ ] Aluno acessa "Meus certificados" e baixa o PDF a qualquer momento

**B2B**
- [ ] Admin convida funcionários de uma instituição contratante 1 a 1 (não há upload em lote no v1)
- [ ] Existe entidade "instituição" no schema com role "gestor de instituição"
- [ ] Gestor de instituição faz login e vê dashboard próprio com progresso e certificados emitidos da equipe da sua instituição (e só da sua)
- [ ] Landing comercial captura lead institucional B2B (já feita) — preservar

**Vídeo em produção**
- [ ] Player abstrai o provider de vídeo (interface única) para trocar YouTube → Bunny Stream sem reescrita
- [ ] Em produção, vídeos são servidos via **Bunny Stream** com token auth (signed URL com expiração curta)
- [ ] Watermark dinâmico do email do aluno na reprodução (anti-pirataria é prioritário)

**Operação**
- [ ] Sentry habilitado em produção com `SENTRY_DSN` configurado e validado em runtime
- [ ] `SUPABASE_SERVICE_ROLE_KEY` validado como obrigatório em produção (hoje é `.optional()` no Zod)
- [ ] CI green em main (lint zero-warning + test:ci + build) antes do deploy

### Out of Scope

<!-- Limites explícitos. Inclui motivo para não voltarem. -->

- **Multi-tenant real (várias consultorias)** — projeto é dedicado à MDHE; arquitetar multi-tenant agora seria gold-plating
- **Pagamento self-service no app (Stripe/Hotmart integrado)** — fluxo ainda não está decidido; convites manuais via admin atendem o v1
- **Quizzes / avaliações intermediárias** — certificado por 100% de conclusão de aulas é suficiente no v1
- **Prova final / nota mínima** — sem avaliação automatizada no v1
- **Upload em lote de funcionários (CSV)** — admin convida 1 a 1 no v1; CSV é v2 se demanda surgir
- **Gestor de instituição cadastrando funcionários sozinho** — quem convida é a MDHE; o gestor só consome relatório
- **Redesign visual** — explicitamente adiado; foco é funcional primeiro, redesenho depois
- **App mobile nativo** — fora de escopo; web responsivo basta
- **Integração com LMS externo (SCORM/xAPI)** — fora de escopo; conteúdo nasce e fica na plataforma

## Context

**Cliente / produto.** A MDHE Consultoria já tem autoridade no mercado: curso aprovado pelo Departamento de Sociologia da UnB, projeto aprovado pela EAPE/SEDF, +91.000 pessoas impactadas, atuação em 123 escolas públicas e em colégios particulares de referência (Marista, Leonardo da Vinci, Thomas Jefferson, UNICEUB). O conteúdo é sensível e a marca é vendida como "soluções testadas, validadas e escaláveis" — daí a prioridade alta de anti-pirataria de vídeo.

**Conteúdo já existente.** As aulas estão atualmente em um Google Drive do cliente; vão ser migradas para YouTube unlisted no ambiente de dev (custo zero) e para Bunny Stream em produção. Materiais complementares (manuais, tarjetas operacionais, planos) já existem como artefatos consultivos da MDHE — entram como anexos por aula.

**Estado do código (brownfield).** O codebase já tem auth, middleware com 3 anéis, player, materiais com signed URLs, landing comercial e migrações até 0011. Está em andamento (não commitado) o módulo de **certificados** (`src/lib/certificates/`, `src/app/api/certificates/`, `src/components/certificates/`) e a tabela em `0011_courses_and_certificates.sql`. Tudo isso documentado em `.planning/codebase/`.

**Concerns mapeados** (de `.planning/codebase/CONCERNS.md`) que devem ser endereçados durante o v1:
- Trigger de auth/profile já levou 2 fixes emergenciais (migrations 0009/0010)
- `SUPABASE_SERVICE_ROLE_KEY` ainda é `.optional()` no Zod
- Fallback de progresso usa admin client (RLS bypass — precisa justificativa documentada)
- Mojibake de UTF-8 em mensagens de erro
- Geração de PDF de certificado por requisição (caro se escalar)

**Padrões obrigatórios.**
- pt-BR em toda UI/copy
- Validação 100% via Zod em `src/lib/**/schema.ts` (nunca inline em actions)
- Server Actions são o caminho preferido de mutação; API routes só quando precisa ser HTTP-callable
- Lint policy estrita (`--max-warnings=0`)
- Vitest com `environment: node` (sem jsdom) — testar lógica pura/server, não DOM React

## Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + TypeScript strict + Supabase (Auth/DB/Storage) + Tailwind v4 — Já estabelecido no codebase; não trocar
- **Idioma**: Toda UI e copy em pt-BR — Cliente e alunos são brasileiros (escolas do DF e nacional)
- **Banco**: Migrações SQL manuais numeradas (`supabase/migrations/NNNN_*.sql`) — Sem runner automatizado neste repo; aplicar via SQL Editor ou supabase CLI
- **Vídeo prod**: Bunny Stream com token auth + watermark — Anti-pirataria é prioridade do cliente; conteúdo é proprietário e validado academicamente
- **Single-tenant**: Plataforma dedicada à MDHE — Não otimizar para múltiplos clientes/consultorias
- **Lint**: ESLint zero-warning policy (`--max-warnings=0`) — CI quebra com qualquer warning novo
- **Tipagem**: Sempre tipar Supabase clients com `<Database>` — Mantém respostas RLS-safe
- **Env**: Nunca ler `process.env` direto em código de feature; sempre via `getEnv()`/`getClientEnv()` em `src/lib/env.ts` — Validação Zod centralizada e cache
- **Sequência de trabalho**: Funcional primeiro, redesign depois — Não aceitar tarefas de polish visual antes do v1 estar fechado

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-tenant (apenas MDHE) | Cliente é único; multi-tenant seria gold-plating | — Pending |
| B2C + B2B no mesmo v1 | Funil B2B é parte do "lançável" segundo o usuário | — Pending |
| Pagamento adiado | Modelo comercial ainda em definição; convites manuais bastam | — Pending |
| Bunny Stream para vídeo em prod | Custo razoável + token auth + DRM básico — atende anti-pirataria sem custo de Mux | — Pending |
| YouTube unlisted no dev | Custo zero para iterar; player precisa abstrair provider | — Pending |
| Certificado por 100% conclusão | Sem quiz/prova no v1 — simplicidade vence | — Pending |
| Admin convida B2B 1 a 1 | CSV em lote fica para v2 se virar dor real | — Pending |
| Gestor de instituição com dashboard próprio | Escolas precisam visibilidade do progresso da equipe que pagaram | — Pending |
| Redesign após v1 funcional | Funcional primeiro, polish depois — explícito do usuário | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-28 after Phase 1 (Foundation) completion*

## Phase Completion Log

### Phase 1 — Foundation (2026-04-28)

**Status:** Complete (4/5 plans + 1 deferred com bloqueador documentado)

**Validated requirements (13/15):** OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, ENR-01, ENR-02, ENR-04, INST-01, INST-02, INST-03, INST-04, MKT-03

**Deferred requirements (2/15):** EMAIL-01, EMAIL-02 — Plan 01-04 aguardando aquisição de domínio MDHE; bloqueador P0 pré-prod registrado em `docs/DEPLOY-CHECKLIST.md` §4 e em `.planning/phases/01-foundation/01-04-SUMMARY.md`

**Key deliverables shipped:**
- `src/lib/env.ts` — `superRefine` prod-strict para `SUPABASE_SERVICE_ROLE_KEY`
- `src/lib/observability/sentry.ts` — wrapper com no-op quando DSN ausente; `src/app/global-error.tsx` migrado
- `src/lib/certificates/pdf.ts` — `formatCertificateDate` exportada com `America/Sao_Paulo`
- `src/lib/auth/profiles.ts` — `ensureProfileExists` guardrail wired em `src/app/dashboard/page.tsx` com `captureMessage` para visibilidade de drift
- `supabase/migrations/0012_*.sql` + `0013_*.sql` aplicadas (institutions, institution_members, enrollments aditivo, helper SECURITY DEFINER STABLE, 11 RLS policies, backfill 8 admins)
- `docs/DEPLOY-CHECKLIST.md` — checklist pt-BR com env vars, ordem de migrações, smoke tests pós-deploy
- 38 testes Vitest passando; lint zero-warning; typecheck limpo

**Decisão de orquestração:** EMAIL-01/02 deferred tratado como verification debt explicitamente documentada, não gap silencioso. Phase 2 (Catalog CRUD) pode iniciar.
