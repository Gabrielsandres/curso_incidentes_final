# Phase 2: Catalog CRUD - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin da MDHE consegue criar, editar, publicar e arquivar todo o catálogo (cursos → módulos → aulas → materiais) sem abrir o SQL Editor do Supabase. Inclui ENR-03 (admin concede acesso de aluno a curso) contextual à página do curso, e MKT-02 (UTM capture no formulário institucional existente).

10 v1 requirements: CAT-01..07, ENR-03, MKT-01, MKT-02. Out of scope para esta phase: progresso e certificados de aluno (Phase 3), provider de vídeo (Phase 4 — Phase 2 só armazena os campos no schema), gestor de instituição (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Schema + ciclo de vida (CAT-01, CAT-05, CAT-07, success criteria 1, 2, 5)

- **D-01:** Status do curso (rascunho/publicado/arquivado) modelado via **timestamps nulláveis**, sem enum. `courses.published_at timestamptz NULL` e `courses.archived_at timestamptz NULL`. Estado derivado:
  - `archived_at IS NOT NULL` → arquivado
  - `archived_at IS NULL AND published_at IS NOT NULL` → publicado
  - ambos NULL → rascunho
  
  Success criterion 1 já usa `published_at IS NOT NULL` literalmente. Auditoria livre (timestamp = quando publicou/arquivou).

- **D-02:** **Soft delete** em `lessons` e `modules` via coluna `deleted_at timestamptz NULL`. Admin "remove" via UI = `UPDATE deleted_at=now()`. Hard delete continua disponível via SQL Editor (CASCADE em `lesson_progress` permanece intacto), mas é uso administrativo de exceção. RLS de aluno filtra `WHERE deleted_at IS NULL`. Garante success criterion 2 ("deletar aula sem perder histórico de progresso").

- **D-03:** Migration **única `0014_catalog_metadata.sql`** com todos os ALTERs aditivos:
  - `courses`: ADD COLUMN `published_at`, `archived_at` (ambos `timestamptz NULL`)
  - `modules`: ADD COLUMN `deleted_at` (`timestamptz NULL`)
  - `lessons`: ADD COLUMN `deleted_at`, `video_provider text NULL`, `video_external_id text NULL`, `workload_minutes integer NULL`. Coluna legacy `video_url` PRESERVADA (Phase 4 vai migrar dados quando o adapter chegar; até lá ambas convivem).
  - `institutional_leads`: ADD COLUMN `utm_source text NULL`, `utm_medium text NULL`, `utm_campaign text NULL`
  - RLS: ALTER policy de courses (ENR-02 active enrollment já existente) para também filtrar `archived_at IS NULL` na leitura de aluno; manter visão admin sem filtro.
  - Índices: `idx_courses_published_at` e `idx_lessons_deleted_at` para queries comuns.

- **D-04:** `src/lib/database.types.ts` hand-edit no mesmo wave com os novos campos. Update `README.md` migrações lista.

### Navegação admin + reordenação (CAT-01, CAT-02, CAT-03, success criteria 2, 4)

- **D-05:** UI hierárquica via **páginas aninhadas** com URL stateful e RSC normal:
  - `/admin/cursos` — lista cursos (incluindo rascunhos e arquivados, filtrados por status visual)
  - `/admin/cursos/[slug]` — edita curso + lista módulos
  - `/admin/cursos/[slug]/modulos/[moduleId]` — edita módulo + lista aulas
  - `/admin/cursos/[slug]/aulas/[lessonId]` — edita aula + lista materiais
  - `/admin/cursos/[slug]/alunos` — aba de enrollments (D-09)
  
  Breadcrumb component reutilizável em `src/components/admin/breadcrumb.tsx`. Cada página é RSC + um Form Server Action; sem state client além do necessário.

- **D-06:** **Reordenação** via botões ↑/↓ em cada item. Cada botão dispara server action que faz swap de `position` com o vizinho (ou compaction se houver gaps). Sem lib externa, RSC-friendly, acessível por teclado, funciona em mobile sem complicação. Trade-off conhecido: drag-drop seria UX premium mas adiciona dep + complexity; deferred.

- **D-07:** **Validação de slug colidido** (CAT-06, success criterion 4): server action faz `INSERT` direto e captura erro Postgres `23505` (unique violation) → retorna `{ ok: false, error: "Já existe um curso com esse slug. Escolha outro." }` para o form. Sem stack trace, sem precheck (pré-checks são race-prone). Erro renderizado inline próximo ao campo slug via `useActionState`.

### Materiais + ENR-03 (CAT-04, ENR-03, success criterion 3)

- **D-08:** **Whitelist de tipos** de upload de materiais:
  - `application/pdf`
  - `.doc`/`.docx` → `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `.xls`/`.xlsx` → `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `.ppt`/`.pptx` → `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - `image/png`, `image/jpeg`
  
  Validação dupla:
  - Client (`src/components/admin/material-upload.tsx`): `<input type="file" accept="...">` + JS check antes de enviar (UX rápida)
  - Server (`src/lib/materials/storage.ts`): expand `MAX_MATERIAL_FILE_SIZE_BYTES` adjacente com nova constante `ALLOWED_MATERIAL_MIME_TYPES` e check em `assertUploadable()`. Mantém os 20MB max já existentes.
  
  Múltiplos materiais por aula já é suportado pelo schema atual (`lesson_materials` table). Preservar.

- **D-09:** **UI de admin grant (ENR-03)** vive em `/admin/cursos/[slug]/alunos` — aba dentro da página do curso. Página renderiza:
  - Lista de enrollments ativos do curso (user email/name, source, granted_at, expires_at)
  - Botão "Conceder acesso" abre dialog
  - Pendências (enrollments com source='admin_grant' aguardando confirmação de convite — ver D-10)
  
  Alinha com a navegação aninhada de D-05 (admin pensa "quero dar acesso para fulanos NESSE curso").

- **D-10:** **Busca de aluno no dialog "Conceder acesso"**: admin digita email; server action busca em `profiles` por email exato:
  - **Existe**: cria row em `enrollments` (source='admin_grant', granted_at=now(), expires_at=opcional, course_id=current). UNIQUE (user_id, course_id) já protege duplicação.
  - **Não existe**: dialog oferece "Enviar convite e conceder acesso quando aceitar". Reaproveita o fluxo existente em `/admin/usuarios/reenviar-convite/` (criação de auth.user via admin API + invite email). Quando o user aceita o convite e o profile é criado (trigger 0010 + guardrail D-14 da Phase 1), o enrollment já espera por ele. Implementação: criar enrollment com `granted_at=now()` mas só quando profile existir; enquanto isso, manter um registro intermediário em `pending_enrollments` (nova tabela em 0014) ou usar `auth.users.id` provisório se Supabase Auth permitir.
  
  **Detalhe técnico em aberto**: o planner decide entre (a) criar `pending_enrollments(email, course_id, expires_at_after_accept, created_at)` que vira enrollment real ao aceite, ou (b) criar enrollment direto vinculado ao auth.users.id criado pelo invite (mesmo antes do profile existir). Opção (a) é mais limpa; opção (b) tem menos joins. Pesquisador da Phase 2 deve avaliar.

### MKT-02 — UTM capture no form institucional (MKT-01, MKT-02)

- **D-11:** UTM capture via **hidden inputs preenchidos no RSC**:
  - Página `/` (Server Component) lê `searchParams.utm_source/utm_medium/utm_campaign`
  - Passa como `defaultValue` em `<input type="hidden">` dentro do form institucional existente
  - Server action `submitInstitutionalLead` recebe junto com os outros campos
  - Zod schema estendido em `src/lib/marketing/institutional-lead-schema.ts` com 3 campos opcionais (`utm_source: z.string().max(255).optional()`, idem para `medium` e `campaign`)
  - Migration 0014 já adiciona as 3 colunas em `institutional_leads`

- **D-12:** **MKT-01 (preservação da landing)**: nenhuma modificação de copy/layout. Apenas o form institucional ganha os 3 hidden inputs e captura UTMs quando presentes. Test que confirma as 11 seções continuam renderizando deve ser parte do verifier.

### Claude's Discretion

- Layout exato do dashboard `/admin/cursos` (cards vs tabela vs lista com previews) — UI-SPEC.md vai resolver.
- Componente de breadcrumb (criar do zero ou usar pattern existente em alguma lib do projeto). Sem dep nova.
- Texto exato dos botões e mensagens de erro pt-BR.
- Como o status visual ("Rascunho" / "Publicado" / "Arquivado") aparece (badge colorido? Toggle? Dropdown?).
- Estratégia de paginação na lista de enrollments (provavelmente sem paginação no v1 — poucos alunos por curso).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — single-tenant MDHE, pt-BR, manual SQL migrations, Server Actions
- `.planning/REQUIREMENTS.md` — Phase 2 cobre CAT-01..07, ENR-03, MKT-01, MKT-02
- `.planning/ROADMAP.md` — Phase 2 goal + 5 success criteria
- `CLAUDE.md` — Zod-first, typed Supabase clients, lint zero-warning, Vitest node env, pt-BR

### Phase 1 deliverables this phase consumes
- `.planning/phases/01-foundation/01-SUMMARY.md` (and per-plan SUMMARYs) — Phase 2 builds on enrollments table (now with source/granted_at/expires_at/institution_id from Plan 01-03), profiles guardrail (Plan 01-02), Sentry wrapper (Plan 01-01), Zod env (Plan 01-01).
- `supabase/migrations/0013_institutions_enrollments.sql` — RLS de enrollments referência aqui
- `src/lib/observability/sentry.ts` — usar `captureException`/`captureMessage` em server actions de admin para visibilidade

### Codebase reality (read these for patterns)
- `.planning/codebase/CONVENTIONS.md` — Zod schema-first, error handling style
- `.planning/codebase/STRUCTURE.md` — Server Actions vs API routes split

### Files this phase touches directly
- `src/lib/courses/schema.ts` — estender createCourseSchema, updateCourseSchema com publish/archive
- `src/lib/courses/types.ts` — atualizar CourseRow para incluir published_at/archived_at
- `src/lib/courses/queries.ts` — getAvailableCourses já filtra por enrollment (Phase 1); adicionar filtro `published_at IS NOT NULL AND archived_at IS NULL` para o aluno
- `src/lib/modules/schema.ts` — estender com soft delete
- `src/lib/lessons/schema.ts` — estender com video_provider/video_external_id/workload_minutes/soft delete
- `src/lib/materials/storage.ts` — adicionar `ALLOWED_MATERIAL_MIME_TYPES`
- `src/lib/marketing/institutional-lead-schema.ts` — adicionar 3 campos UTM opcionais
- `src/app/actions/upsert-course.ts` — adicionar publish/archive actions
- `src/app/actions/create-module.ts` — já existe; estender com update/delete/reorder
- `src/app/actions/create-lesson.ts` — já existe; estender com update/delete/reorder
- `src/app/actions/create-institutional-lead.ts` — receber e gravar UTMs
- `src/app/admin/page.tsx` — página inicial /admin (ou redirect para /admin/cursos)
- `src/app/admin/course-manager.tsx` — refatorar para integrar com páginas aninhadas
- `src/lib/database.types.ts` — hand-edit para refletir 0014
- `README.md` — adicionar 0014 à lista

### Files this phase creates
- `supabase/migrations/0014_catalog_metadata.sql`
- `src/app/admin/cursos/page.tsx` (lista cursos com filtro por status)
- `src/app/admin/cursos/[slug]/page.tsx` (edita curso + lista módulos)
- `src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx`
- `src/app/admin/cursos/[slug]/aulas/[lessonId]/page.tsx`
- `src/app/admin/cursos/[slug]/alunos/page.tsx` (D-09 ENR-03 UI)
- `src/components/admin/breadcrumb.tsx`
- `src/components/admin/grant-enrollment-dialog.tsx`
- `src/components/admin/material-upload.tsx` (refatoração com whitelist client-side)
- Tabela `pending_enrollments` em 0014 (se planner escolher opção A do D-10)
- Tests (Vitest, environment: node):
  - `src/lib/courses/schema.test.ts` — estende com publish/archive cases
  - `src/lib/marketing/institutional-lead-schema.test.ts` — estende com UTMs
  - `src/lib/materials/storage.test.ts` (novo) — whitelist
  - `src/app/actions/upsert-course.test.ts` (novo) — slug collision
  - `src/app/actions/grant-enrollment.test.ts` (novo) — D-09/D-10

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/admin/course-manager.tsx` — admin component existente. Refatorar (não jogar fora) para a nova navegação aninhada; alguns sub-componentes (form de campos do curso, image upload de capa) podem virar peças menores.
- `src/lib/courses/queries.ts` — `getAvailableCourses` já existe; estender com filtro de status. `getCourseWithContent` já carrega module/lesson/material — usar para a página `/admin/cursos/[slug]`.
- `src/app/actions/upsert-course.ts`, `create-module.ts`, `create-lesson.ts` — já existem como base; cada um precisa receber update/delete/reorder companions.
- `src/app/actions/create-institutional-lead.ts` — já grava em `institutional_leads` via service-role client (admin client). Adicionar 3 campos UTM ao insert.
- `src/lib/materials/storage.ts` + `src/app/api/materials/upload/route.ts` — upload já valida tamanho. Adicionar whitelist de MIME ao assertUploadable.
- `src/app/admin/usuarios/reenviar-convite/` — fluxo de invite existente; reusar para D-10.

### Established Patterns
- **Form errors via `useActionState`**: padrão usado em course-manager.tsx (CourseFormState). Repetir para os novos forms.
- **`requireAdminUser()` server-side guard**: `src/app/actions/upsert-course.ts` mostra o pattern. Toda nova server action de admin deve checar role via `fetchUserRole`.
- **Zod schemas em `src/lib/**/schema.ts`**: nunca inline em actions/routes (CLAUDE.md).
- **Tests com mocks de Supabase**: padrão em `src/lib/courses/queries.test.ts` e `src/app/actions/create-lesson.test.ts`.
- **Logger + Sentry wrapper**: `logger.error` para erros operacionais (DB, network); `captureException` quando algo é inesperado e quer alertar Sentry.

### Integration Points
- `middleware.ts` — `/admin` já protegido (admin-only via Phase 1). Novas rotas `/admin/cursos/...` herdam automaticamente porque match prefix `/admin`. Sem mudança no middleware.
- Phase 1 schema (institutions, enrollments com source/expires_at/institution_id) — Phase 2 ENR-03 usa o `source='admin_grant'` decidido em D-07/Phase 1.
- Phase 4 vai precisar de `lessons.video_provider` + `video_external_id` — Phase 2 já cria as colunas no 0014; Phase 4 só implementa o adapter consumindo.
- `MyCertificates` component em dashboard — já existe; Phase 2 não toca.

</code_context>

<specifics>
## Specific Ideas

- O dashboard `/admin/cursos` (D-05) deve mostrar contadores claros: "3 publicados · 2 rascunhos · 1 arquivado" no topo, para o admin saber o estado geral.
- A "remoção" de aula via UI deve mostrar confirmação dupla mencionando "Esta aula será arquivada. Histórico de progresso de alunos é preservado." — comunica que é soft delete.
- Slug input deve ter slugify automático sugerido a partir do title (cliente preview, mas validação final no server).
- O dialog "Conceder acesso" (D-09/D-10) deve sempre mostrar a opção "Sem expiração" como default (B2C vitalício é o caso comum), com toggle "Definir data de expiração" abrindo o date picker.
- Pre-validação de slug pelo client (regex) já existe; manter mas não confiar — server é a fonte de verdade.

</specifics>

<deferred>
## Deferred Ideas

Cada item abaixo voltou à mesa em Phase 2 e foi explicitamente adiado. Não perder.

- **Audit log de mudanças no catálogo** — tabela `catalog_audit_log` registrando CREATE/UPDATE/DELETE de admin com user_id e timestamp. Útil quando crescer a equipe da MDHE; com 1 admin não justifica. Revisitar em Phase 6+.
- **Bulk import / CSV de cursos** — admin sobe arquivo com vários cursos de uma vez. v2 (B2B-V2 já cobre conceito similar).
- **Analytics dashboard de leads institucionais** — ver UTMs agregados, taxa de conversão. v2.
- **Preview de curso em rascunho** — admin vê como aluno verá. Útil; deferred porque não bloqueia o ciclo de publicar.
- **Versões / draft history** — armazenar histórico de mudanças por campo. Demanda complexa; nenhum sinal de necessidade no v1.
- **Busca/filtros avançados de cursos no admin** — com 5-10 cursos do v1, lista cronológica basta. Adicionar quando crescer.
- **Drag-and-drop com @dnd-kit** para reordenação — UX premium mas decidiu-se botões ↑↓ no v1. Revisitar se admin reclamar.
- **Tabela `lead_utm_attributions` com first_touch / last_touch** — overkill para v1; UTMs ficam como colunas no próprio `institutional_leads`.

</deferred>

---

*Phase: 02-catalog-crud*
*Context gathered: 2026-04-28*
