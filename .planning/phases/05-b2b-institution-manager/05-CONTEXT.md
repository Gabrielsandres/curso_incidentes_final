# Phase 5: B2B Institution Manager — Context

**Gathered:** 2026-05-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin da MDHE cria uma instituição em `/admin/instituicoes`, vincula alunos existentes e convida novos, e atribui um deles como gestor. O gestor loga em `/gestor` e vê o progresso e certificados da equipe da sua própria instituição — apenas da sua, garantido por RLS (não filtro de aplicação). Convites institucionais carregam template pt-BR mencionando o nome da instituição contratante.

5 v1 requirements: INST-05, INST-06, INST-07, INST-08, EMAIL-03.

**Out of scope:**
- Bulk invite via CSV (B2B-V2-01) — admin convida 1 a 1
- Gestor convidando funcionários por conta própria (B2B-V2-02) — só MDHE convida
- Relatório PDF/Excel exportável do dashboard do gestor (B2B-V2-03)
- Página pública `/verificar/[code]` para verificação externa de certificados (deferred, v2)
- Schema migrations — Phase 5 é app-layer only; tabelas + RLS já vieram da Phase 1
- Resend SDK / EMAIL-01/02 (deferred, aguardando domínio MDHE)

</domain>

<decisions>
## Implementation Decisions

### Manager role model + middleware (INST-05, INST-06)

- **D-01:** "Institution manager" é representado em **duas camadas**:
  - `profiles.role = 'institution_manager'` — usado pelo middleware como gate global de `/gestor` (mesmo padrão do gate de `admin` em `/admin`)
  - `institution_members.role = 'manager'` — identifica QUAL instituição esse usuário gerencia (queries usam isso para resolver o `institution_id` do dashboard)

  Razão: middleware já lê `profiles.role`; reusar o padrão evita JOIN em toda request. O `institution_members.role` resolve "qual instituição" sem segundo lookup.

- **D-02:** Middleware ganha um quarto anel: `GESTOR_ROUTES = ["/gestor"]` em `middleware.ts`, e o `matcher` no rodapé inclui `/gestor/:path*`. A regra:
  - Não autenticado em `/gestor` → redireciona para `/login?redirectTo=/gestor`
  - Autenticado mas `role !== 'institution_manager' && role !== 'admin'` → redireciona para `/dashboard`
  - **Admin acessando `/gestor`** → bloqueado (redireciona para `/admin/instituicoes`). Admin não usa `/gestor`; usa `/admin/instituicoes/[slug]` para a mesma visibilidade.
  - **Manager órfão** (`profiles.role='institution_manager'` mas zero linhas em `institution_members`) → redireciona para `/dashboard` com flash message ("Sua instituição ainda não foi configurada. Contate o admin.")

- **D-03:** URL é **`/gestor` singular** (sem slug), não `/gestor/[slug]`. Razão: no v1 cada gestor pertence a exatamente uma instituição, então o slug seria redundante. RLS já restringe acesso à instituição correta (success criterion 2 fica satisfeito via "apenas da sua" → policies, não filtro). **Desvio explícito de ROADMAP.md:** o roadmap success criterion 2 diz `/gestor/[slug]`. Mantemos `/gestor` por simplicidade do v1; se um gestor passar a gerenciar múltiplas instituições no futuro, migra-se para `/gestor/[slug]` (decisão deferred).

- **D-04:** A página `/gestor` resolve a instituição do gestor via query: `select institution_id from institution_members where profile_id = auth.uid() and role = 'manager' limit 1`. Se zero rows → redireciona (orphan case D-02). Se uma row → renderiza dashboard daquela instituição.

### Admin UI for institutions (INST-08)

- **D-05:** Admin gerencia instituições em uma **nova seção `/admin/instituicoes`** que espelha o padrão de `/admin/cursos`:
  - `/admin/instituicoes` (list page) — tabela de instituições (nome, slug, contato, # de membros, # com gestor)
  - `/admin/instituicoes/nova` (create page) — formulário com nome + slug auto-gerado + contato
  - `/admin/instituicoes/[slug]` (detail page) — gestão de membros + atribuição de gestor

  "Instituições" entra no nav admin junto a "Cursos" e "Usuários".

- **D-06:** Na detail page, **anexar aluno existente** é a UX primária:
  - Campo de busca com auto-complete contra `profiles where role = 'student'` (e exclui já-membros). Admin seleciona → server action insere `institution_members` row com `role='student'`. Mirror do padrão `grant-enrollment.ts`.
  - **Convidar novo aluno** é um segundo formulário na mesma página: full_name + email. Submit chama Edge Function `Criar-usuario` com `institution_id` no payload. A função faz invite (com institution_name no metadata, ver D-09) + insere `institution_members` row em sequência.
  - Se admin tenta convidar email que já existe em `profiles`, **block + erro claro**: "Email já cadastrado. Use 'Adicionar aluno existente'." Não há auto-attach silencioso.

- **D-07:** **Atribuição de gestor** é per-row na detail page:
  - Cada linha de membro tem ação "Promover a gestor". Click → server action `promoteInstitutionManagerAction(institution_id, profile_id)` que:
    1. Atualiza `profiles.role = 'institution_manager'` (via admin client)
    2. Atualiza `institution_members.role = 'manager'` para esse profile
    3. Auto-demote: para qualquer outra `institution_members` row dessa instituição com `role='manager'` (que não seja o promovido), seta de volta para `role='student'`. Se essa for a única instituição daquele user, também demove `profiles.role` de volta para `'student'`. **Constraint v1: uma instituição = um gestor por vez.**
  - Botão "Rebaixar a aluno" inverte a ação (seta `profiles.role='student'` se for o único `manager` global desse user, e seta `institution_members.role='student'`).

- **D-08:** **Anexar é independente de matricular em cursos.** Vincular um aluno a uma instituição apenas insere a linha em `institution_members` — não cria `enrollments`. Matrícula em cursos continua via `/admin/cursos/[slug]` (fluxo de Phase 2 com `grant-enrollment.ts`). **Detach é soft:** remove `institution_members` row apenas; `enrollments` (mesmo com `institution_id` apontando para a instituição agora separada), progresso e certificados ficam preservados (alinhado com CERT-05). RLS faz o gestor perder visibilidade imediatamente após detach.

### Invite flow + pt-BR template (EMAIL-03)

- **D-09:** **Email institucional usa o template do Supabase Auth** (configurado no painel), não Resend. A Edge Function `Criar-usuario` é estendida para aceitar `institution_id` no payload; resolve `institution_name` (admin client lookup) e passa em `data` (user_metadata) na chamada `auth.admin.inviteUserByEmail`. O template no painel usa `{{ .Data.institution_name }}` em copy pt-BR. **Razão:** EMAIL-01/02 estão deferred (aguardando domínio MDHE). Resend SDK exigiria domínio verificado. Supabase template não exige nada novo de infra — destrava Phase 5.

- **D-10:** **Texto do template fica em `docs/email-templates.md`** — admin copia/cola no painel Supabase Auth. O doc inclui:
  - Subject pt-BR: "Bem-vindo(a) à plataforma MDHE — convite de {{ .Data.institution_name }}"
  - Body HTML pt-BR completo, com variáveis `{{ .ConfirmationURL }}` e `{{ .Data.institution_name }}`
  - Steps pt-BR: "Acesse Supabase Dashboard → Authentication → Email Templates → Invite User → cole o conteúdo abaixo"
  - Versão fallback (sem institution_name) caso o invite seja disparado sem o metadata (ex.: `/admin/usuarios` legado fora do contexto B2B)

- **D-11:** **Edge Function `Criar-usuario` extension contract:**
  - Payload novo: `{ action: "invite", email, full_name, institution_id?: uuid }`
  - Quando `institution_id` está presente:
    1. Lookup `institutions.name` via admin client (404 se não existe → erro claro)
    2. Invite com `data: { full_name, institution_name }` no metadata
    3. Após Supabase confirmar invite + criar profile (via trigger fail-safe + ensureProfileExists), insere `institution_members` row
    4. Retorna `{ ok: true, message: "Convite enviado para {email} da instituição {institution_name}" }`
  - Quando ausente: comportamento atual (B2C-style invite) — preserva compatibilidade com `/admin/usuarios` existente
  - Email-already-exists check: pre-flight `select id from profiles where email = ?` → se exists, retorna 409 com message bloqueante (D-06)

### Manager dashboard data shape (INST-07)

- **D-12:** Dashboard `/gestor` (page.tsx) renderiza **layout matriz: linhas=alunos, colunas=cursos, células=% completion**:
  - Header da página: nome da instituição + count de membros
  - Tabela principal: cada linha é um aluno (full_name); colunas são os cursos publicados onde a instituição tem ≥1 enrollment; células mostram "85% — 17/20 aulas" ou "—" se sem enrollment naquele curso
  - Enrollments expirados aparecem visualmente marcados (cinza + "expirado") — manager mantém visibilidade histórica conforme ENR-04. Para incluir expirados na query, o gestor precisa de ou (a) admin client server-side com filtro explícito por `institution_id`, ou (b) RLS adicional permitindo manager ler enrollments expirados. **Decisão: opção (a)** — query do gestor usa server-side admin client com `institution_id` filter; RLS de leitura existente fica para outros call-sites. Documenta-se justificativa de bypass conforme PROJECT.md Concerns.
  - Seção "Certificados emitidos" abaixo da matriz: tabela com `aluno`, `curso`, `data emissão` (formatada America/Sao_Paulo), `código de verificação` (texto monoespaçado, sem link, sem download)

- **D-13:** **Empty states progressivos**:
  - 0 alunos vinculados → "Nenhum aluno vinculado ainda. Entre em contato com a MDHE para vincular sua equipe." + email/whatsapp de contato (do PROJECT.md context — MDHE Consultoria)
  - >0 alunos mas 0 enrollments → "Sua equipe ainda não tem acesso a nenhum curso. Aguarde a MDHE liberar o acesso aos cursos contratados."
  - >0 enrollments mas 0 certificates → seção certificados mostra "Nenhum certificado emitido ainda. Certificados aparecem aqui quando seus alunos concluírem 100% das aulas de um curso."

- **D-14:** **Queries novas em `src/lib/institutions/queries.ts`** (novo módulo):
  - `getInstitutionForManager(client, userId)` — resolve `institution_id` do gestor; null se órfão
  - `getInstitutionMembersWithProgress(adminClient, institution_id)` — retorna por aluno: array de `{course_id, course_title, totalLessons, completedLessons, completionPercentage, enrollmentExpired: boolean}`. Reusa lógica de `getAvailableCourses` mas para múltiplos `userId`s (batched).
  - `getInstitutionCertificates(adminClient, institution_id)` — retorna `{aluno_name, course_title, issued_at, certificate_code}[]` ordenados por `issued_at desc`.
  - Schemas Zod em `src/lib/institutions/schema.ts` (criar instituição, anexar membro, etc.)

- **D-15:** **Verification page é OUT-OF-SCOPE.** O `certificate_code` aparece como texto plano (monospace, copiável manualmente). Não há `/verificar/[code]` neste phase. Capturar como deferred idea para v2.

### Claude's Discretion

- Componentização exata da matriz (table HTML vs grid CSS — planner decide com base em legibilidade Tailwind)
- Estrutura interna do `institution-manager.tsx` client component (paralela ao `course-manager.tsx`)
- Se `promoteInstitutionManagerAction` é uma única action atômica (recomendado) ou split em sub-actions
- Schema Zod exato para o input do convite institucional (similar ao Phase 1 leads, com `institution_id` como UUID validado)
- Detecção do "único gestor global" no demote — query simples vs flag — fica a critério do planner

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — single-tenant MDHE, pt-BR, Server Actions, Zod-first, B2B no v1
- `.planning/REQUIREMENTS.md` — INST-05, INST-06, INST-07, INST-08, EMAIL-03; out-of-scope: B2B-V2-01/02/03, PAY-V2-*
- `.planning/ROADMAP.md` — Phase 5 goal + 5 success criteria. NOTA: criterion 2 menciona `/gestor/[slug]`; Phase 5 deliberadamente usa `/gestor` (singular) — ver D-03.
- `CLAUDE.md` — Zod, typed Supabase, lint zero-warning, Vitest node env, pt-BR

### Phase 1 deliverables que Phase 5 consome
- `supabase/migrations/0012_add_institution_manager_role.sql` — enum `user_role` agora tem `'institution_manager'`
- `supabase/migrations/0013_institutions_enrollments.sql` — tabelas `institutions`, `institution_members`, ALTER em `enrollments`, helper `is_member_of_institution()`, todas as RLS policies (incluindo "Institution managers read institution enrollments" que cobre INST-06 no nível de DB)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-06, D-08 (schema decisions), D-12 (Resend deferred — ainda válido em Phase 5)
- `src/lib/database.types.ts` — types já refletem schema da Phase 1; pode precisar regenerar se queries novas usarem joins não-tipados

### Existing code patterns para reusar
- `src/app/admin/cursos/` — pattern para list/detail/create CRUD com server actions
- `src/app/admin/usuarios/user-manager.tsx` + `src/lib/admin/call-admin-user-function.ts` — pattern do invite client → Edge Function
- `src/app/actions/grant-enrollment.ts` — pattern de admin server action com requireAdminUser + admin client
- `src/lib/courses/queries.ts` — `getAvailableCourses` (usar como base para per-team progress query)
- `src/lib/courses/queries.ts` — `getUserCertificatesByCourseId` (usar como base para per-institution certificates)
- `middleware.ts` — pattern de adicionar novo route ring + atualizar matcher

### Edge Function a estender
- `supabase/functions/Criar-usuario/index.ts` — adicionar suporte a `institution_id` no payload (D-11)

### Files this phase creates
- `src/app/admin/instituicoes/page.tsx` — list page
- `src/app/admin/instituicoes/nova/page.tsx` — create page
- `src/app/admin/instituicoes/[slug]/page.tsx` — detail page
- `src/app/admin/instituicoes/institution-manager.tsx` — client component (similar a course-manager)
- `src/app/gestor/page.tsx` — manager dashboard
- `src/app/gestor/layout.tsx` — manager layout (logout, nav minimal)
- `src/lib/institutions/queries.ts` — new queries module
- `src/lib/institutions/schema.ts` — Zod schemas
- `src/lib/institutions/types.ts` — types
- `src/app/actions/upsert-institution.ts` — server action
- `src/app/actions/attach-institution-member.ts` — server action
- `src/app/actions/promote-institution-manager.ts` — server action (também demote)
- `src/app/actions/detach-institution-member.ts` — server action
- `docs/email-templates.md` — pt-BR Supabase Auth templates (EMAIL-03)

### Files this phase modifies
- `middleware.ts` — adicionar GESTOR_ROUTES, gate logic, matcher
- `supabase/functions/Criar-usuario/index.ts` — extend com institution_id flow (D-11)
- `src/lib/admin/call-admin-user-function.ts` — payload type ganha institution_id opcional
- `src/app/admin/page.tsx` ou nav admin layout — adicionar link "Instituições"

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Edge Function pattern** (`Criar-usuario`) — já tem auth check + invite flow; estender para aceitar institution_id sem reescrever a função
- **`grant-enrollment.ts` action** — referência completa para `requireAdminUser` + admin client + revalidatePath. Copiar o esqueleto para todas as actions novas
- **`getAvailableCourses(client, userId)`** — calcula `completionPercentage` por curso. Para gestor precisamos versão batched que aceita `userIds[]` (ou itera N vezes — batch é melhor)
- **`MyCertificates` component** — não reusável diretamente (mostra dados do próprio user, com download), mas referência para tipos `CourseCertificateRow` e formato de data
- **Pattern de `course-manager.tsx`** — client form com state local + server action via `useActionState`; espelhar para `institution-manager.tsx`

### Established Patterns
- Server Actions para mutações (CLAUDE.md). Toda action nova vai em `src/app/actions/<verb>-<noun>.ts` com state file `<verb>-<noun>-state.ts`
- RLS-first: queries do gestor confiam em RLS para isolation. Bypass via admin client SOMENTE quando precisamos incluir expirados (D-12) — documenta-se a justificativa inline
- Zod schemas em `src/lib/<domain>/schema.ts` — nunca inline em actions
- Supabase clients tipados com `<Database>` em todos os lugares — ao adicionar joins novos, regenerar `database.types.ts` se necessário

### Integration Points
- **Middleware** — quarto anel `/gestor` adicionado ao mesmo arquivo; mesmo `fetchUserRole` já gerenciando admin gate, bastando estender a lógica de role check
- **Invite flow** — `Criar-usuario` Edge Function é o ponto de extensão; `call-admin-user-function.ts` ganha um novo payload variant
- **RLS já cobre INST-06** — policy "Institution managers read institution enrollments" filtra automaticamente por `is_member_of_institution(institution_id)`. Phase 5 não escreve novas RLS; apenas consome as existentes. Exceção: queries de progresso/certificados que precisam incluir expirados usam admin client server-side com filtro explícito (D-12)
- **CERT-05 já garantido** — adicionar aulas a curso após certificado emitido não invalida; gestor vê certificado original, código original. Sem trabalho novo.

</code_context>

<specifics>
## Specific Ideas

- Slug da instituição segue mesma regra do slug de curso (a-z, 0-9, hyphen) — reusar `slugify()` de `src/lib/courses/slugify.ts`
- Empty state da matriz com 0 alunos deve incluir contato direto MDHE (email + whatsapp) — copiar do contexto comercial em PROJECT.md
- Auto-complete do "Adicionar aluno existente" deve excluir alunos já membros da instituição (não-membros only); incluir hint visual quando 0 results para diferenciar "ainda não digitou" de "ninguém encontrado"
- Toast de sucesso pós-promoção: "{nome} agora é gestor de {instituição}. {nome anterior} foi rebaixado a aluno." (mostra a auto-demote para o admin saber)
- Tabela de certificados ordenada por `issued_at DESC` — mais recentes primeiro
- "Promover a gestor" e "Rebaixar a aluno" devem ter `useTransition` para feedback imediato; estado pendente no botão
- Hint no campo institution.contact_email: "Email do contato comercial na instituição (não é o gestor da plataforma)"
- Página `/gestor` deve ter o nome da instituição em <h1> grande para o gestor sentir contexto imediato
- Texto do email institucional (D-10) deve mencionar curso/CTA para facilitar onboarding: "Você foi convidado pela MDHE para acessar a plataforma de cursos como aluno da {{ .Data.institution_name }}. Clique no link abaixo para criar sua senha e começar."

</specifics>

<deferred>
## Deferred Ideas

- **`/verificar/[code]` página pública de verificação de certificado** — útil para terceiros (compliance, RH validando certificado externo). Adiciona schema de query + RSC + design. v2 quando certificados começarem a circular fora da plataforma.
- **`/gestor/[slug]` para múltiplas instituições por gestor** — hoje gestor pertence a uma instituição apenas. Se um gestor multi-instituição surgir, migrar URL para `/gestor` (lista) + `/gestor/[slug]` (detalhe).
- **Bulk invite via CSV (B2B-V2-01)** — confirmado out-of-scope; v2.
- **Gestor convidando funcionários sozinho (B2B-V2-02)** — confirmado out-of-scope; v2. RLS atual nem permite gestor escrever em `institution_members`.
- **Relatório PDF/Excel exportável (B2B-V2-03)** — gestor copia/cola dados da matriz manualmente no v1.
- **Auto-template-drift test entre `docs/email-templates.md` e o painel Supabase** — comparar string em runtime via API. v2 se drift virar dor real.
- **Resend SDK wrapper (D-12 Phase 1)** — continua deferred. EMAIL-03 escolheu rota Supabase template + metadata, eliminando a necessidade no v1.
- **Toggle "Mostrar expirados" no dashboard do gestor** — hoje sempre mostra expirados (greyed). Toggle adiciona UI complexity sem dor visível.
- **Manager pode ver certificate PDF preview (read-only)** — atualmente `sem link de download direto`; se manager precisar visualizar conteúdo do certificado para auditar autenticidade, considerar PDF read-only signed URL (TTL muito curto, sem download attribute). v2 se demanda surgir.
- **Notificação ao gestor quando aluno conclui curso** — email "Funcionário X concluiu o curso Y" para o gestor. Útil mas EMAIL-01/02 deferred + adiciona event flow.

</deferred>

---

*Phase: 05-b2b-institution-manager*
*Context gathered: 2026-05-02*
