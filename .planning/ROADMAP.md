# Roadmap: Plataforma MDHE — Gestão de Incidentes (v1)

## Overview

Brownfield completion sprint that transforms the existing Next.js 16 + Supabase skeleton (auth, player, materials, landing) into a fully shippable B2C + B2B course platform. Work flows in five dependency-ordered phases: schema foundation first (everything else would be blocked without it), then multi-course admin CRUD, then student progress and certificate completion, then video provider abstraction and anti-piracy, and finally the B2B institution manager dashboard. At the end of Phase 5, a student — B2C or B2B — can enroll, watch all lessons, download materials, receive a PDF certificate automatically, and a school coordinator can view their team's progress; all without the MDHE team touching SQL.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Schema migrations, enrollment model, ops hardening (service role key, UTC cert date, Sentry, Resend SMTP) (completed 2026-04-28)
- [ ] **Phase 2: Catalog CRUD** - Multi-course admin UI: courses, modules, lessons, materials, publish/archive
- [ ] **Phase 3: Progress & Certificates** - Student dashboard with % completion, auto-certificate on 100%, Meus certificados
- [ ] **Phase 4: Video & Anti-Piracy** - VideoProvider abstraction (YouTube dev / Bunny prod), CSS watermark overlay
- [ ] **Phase 5: B2B Institution Manager** - Institution schema TypeScript layer, /gestor dashboard, invite emails via Resend

## Phase Details

### Phase 1: Foundation
**Goal**: All schema prerequisites for v1 features exist in the database, critical pre-production bugs are fixed, and the ops baseline (env validation, error reporting, email delivery) is production-ready.
**Depends on**: Nothing (first phase)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, ENR-01, ENR-02, ENR-04, INST-01, INST-02, INST-03, INST-04, MKT-03, EMAIL-01, EMAIL-02
**Success Criteria** (what must be TRUE):
  1. Aplicacao falha no boot em producao se `SUPABASE_SERVICE_ROLE_KEY` nao esta configurado (nao sobe silenciosamente)
  2. Certificado emitido para um aluno que conclui aula apos as 21h no horario de Brasilia exibe a data correta (America/Sao_Paulo), nao a data UTC do dia seguinte
  3. Erros de runtime em producao aparecem no painel do Sentry; ausencia do DSN nao crasha a aplicacao
  4. Emails de confirmacao, recuperacao de senha e convite saem via Resend (nao pelo SMTP padrao do Supabase) e chegam a inboxes de Gmail e Outlook
  5. Tabelas `institutions`, `institution_members` e coluna `enrollments.institution_id` existem no banco com RLS habilitada e helpers SECURITY DEFINER criados; aluno sem enrollment ativo nao consegue abrir nenhuma aula
**Plans**: 5 plans

Plans:
- [x] 01-01-PLAN.md — Env hardening (superRefine) + Sentry wrapper + global-error.tsx swap
- [x] 01-02-PLAN.md — Certificate timezone fix (America/Sao_Paulo) + ensureProfileExists guardrail
- [x] 01-03-PLAN.md — Schema migrations 0012/0013 + database.types.ts + README + [BLOCKING] SQL apply
- [x] 01-04-PLAN.md — Resend SMTP panel config + SPF/DKIM DNS + deliverability verification
- [x] 01-05-PLAN.md — Deploy checklist (docs/DEPLOY-CHECKLIST.md) + CI green verification

### Phase 2: Catalog CRUD
**Goal**: Admin da MDHE consegue criar e publicar um catalogo completo de cursos — com modulos, aulas e materiais — sem abrir o SQL Editor do Supabase.
**Depends on**: Phase 1
**Requirements**: CAT-01, CAT-02, CAT-03, CAT-04, CAT-05, CAT-06, CAT-07, ENR-03, MKT-01, MKT-02
**Success Criteria** (what must be TRUE):
  1. Admin cria um curso com titulo, slug unico, descricao e capa, define status como "rascunho" ou "publicado", e o curso aparece na listagem apenas quando publicado (`published_at IS NOT NULL`)
  2. Admin adiciona modulos ao curso, reordena as aulas dentro de cada modulo, e deleta uma aula sem perder o historico de progresso dos alunos que ja assistiram
  3. Admin anexa um PDF a uma aula e o arquivo fica disponivel para download autenticado; remover o material nao quebra aulas existentes
  4. Ao tentar criar um curso com slug ja existente, o admin ve uma mensagem de erro clara sobre colisao de slug (sem stack trace exposto)
  5. Admin marca um curso como "arquivado" e ele some da visao do aluno, mas certificados e progresso anteriores permanecem intactos
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md — Schema migration 0014 (lifecycle timestamps, soft delete, UTMs, pending_enrollments) + database.types.ts + [BLOCKING] SQL apply
- [ ] 02-02-PLAN.md — Course CRUD server actions (create/update/publish/archive/unpublish) + slug collision handling + queries extension
- [ ] 02-03-PLAN.md — Module + Lesson CRUD server actions (create/update/delete soft/reorder) + schema extensions
- [ ] 02-04-PLAN.md — Materials MIME whitelist (server + client) + material-upload component
- [ ] 02-05-PLAN.md — Admin RSC page tree (/admin/cursos hierarchy) + 4 shared UI components (Breadcrumb, StatusBadge, ReorderButtons, ConfirmationDialog)
- [ ] 02-06-PLAN.md — ENR-03: grant-enrollment server actions (lookup + direct + invite) + pending enrollment reconciliation + /admin/cursos/[slug]/alunos page + GrantEnrollmentDialog
- [ ] 02-07-PLAN.md — MKT-02: UTM capture (schema extension + action + landing page hidden inputs) + MKT-01 landing preservation

### Phase 3: Progress & Certificates
**Goal**: Aluno consegue acompanhar seu progresso por curso, retomar de onde parou, e receber o certificado em PDF automaticamente ao concluir 100% das aulas.
**Depends on**: Phase 2
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, CERT-01, CERT-02, CERT-03, CERT-04, CERT-05
**Success Criteria** (what must be TRUE):
  1. Dashboard `/dashboard` exibe a porcentagem de aulas concluidas para cada curso matriculado do aluno, atualizando apos cada aula marcada como concluida
  2. Botao "Continuar de onde parei" leva o aluno diretamente a ultima aula incompleta do curso (nao ao inicio)
  3. Ao concluir a ultima aula, o player exibe um banner "Curso concluido — certificado disponivel" sem recarregar a pagina
  4. Aluno acessa "Meus certificados", clica em baixar e recebe um PDF valido com nome sem mojibake (ç, ã, õ corretos), nome do curso, data em America/Sao_Paulo e codigo UUID de verificacao
  5. Adicionar uma aula nova ao curso depois que o aluno ja recebeu o certificado nao invalida nem re-emite o certificado existente
**Plans**: TBD
**UI hint**: yes

### Phase 4: Video & Anti-Piracy
**Goal**: O player abstrai o provider de video — YouTube no dev, Bunny Stream com token auth em producao — e exibe watermark com o email do aluno para dissuadir pirataria.
**Depends on**: Phase 2
**Requirements**: VID-01, VID-02, VID-03, VID-04, VID-05, AP-01, AP-02, AP-03, AP-04
**Success Criteria** (what must be TRUE):
  1. Em `NODE_ENV=development`, aulas carregam via YouTube unlisted; em `NODE_ENV=production`, tentativa de usar adapter YouTube gera erro de build (nunca chega a producao)
  2. Em producao, o embed do Bunny usa signed URL com TTL curto (≤ 4h); a chave `BUNNY_STREAM_TOKEN_KEY` nunca aparece no bundle ou nos headers de resposta enviados ao browser
  3. Durante reproducao de qualquer aula, o email do aluno aparece em overlay sobre o video em opacidade reduzida, mudando de posicao a cada 30 segundos
  4. Reproducao em dispositivo mobile (rede 4G brasileira com CGNAT) funciona normalmente — nao ha IP-binding nos tokens Bunny
  5. Documentacao em `docs/` descreve honestamente o teto da protecao (overlay e deterrencia, screen recording continua possivel)
**Plans**: TBD
**UI hint**: yes

### Phase 5: B2B Institution Manager
**Goal**: Admin da MDHE cria uma instituicao, vincula alunos e atribui um gestor; o gestor loga em `/gestor` e ve o progresso e certificados da equipe da sua propria instituicao — apenas da sua.
**Depends on**: Phase 1, Phase 3
**Requirements**: INST-05, INST-06, INST-07, INST-08, EMAIL-03
**Success Criteria** (what must be TRUE):
  1. Admin cria uma instituicao, convida um aluno com role `gestor_instituicao`, e esse aluno consegue logar e acessar `/gestor`; alunos sem esse role sao redirecionados para `/dashboard`
  2. Dashboard do gestor em `/gestor/[slug]` lista apenas os alunos vinculados a sua propria instituicao — acesso a dados de outra instituicao retorna vazio (RLS, nao apenas filtro de aplicacao)
  3. Gestor ve porcentagem de progresso por curso para cada membro da sua equipe
  4. Gestor ve lista de certificados emitidos para membros da sua instituicao (nome do aluno, curso, data, codigo), sem link de download direto do PDF
  5. Convite institucional disparado pelo admin chega com template pt-BR mencionando o nome da instituicao contratante
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

Note: Phase 4 (Video) depends only on Phase 2 (Catalog). If capacity allows, Phase 4 and Phase 3 can be developed in parallel — both depend on Phase 2 completing first, but have no dependency on each other.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 5/5 | Complete    | 2026-04-28 |
| 2. Catalog CRUD | 0/7 | Not started | - |
| 3. Progress & Certificates | 0/TBD | Not started | - |
| 4. Video & Anti-Piracy | 0/TBD | Not started | - |
| 5. B2B Institution Manager | 0/TBD | Not started | - |
