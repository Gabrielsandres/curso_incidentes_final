---
phase: 02-catalog-crud
verified: 2026-04-28T10:50:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Admin cria um curso em /admin/cursos/novo, preenche titulo, slug, descricao e capa, salva como rascunho e confirma que nao aparece em /dashboard. Em seguida publica o curso e confirma que aparece em /dashboard."
    expected: "Rascunho oculto em /dashboard; apos publicar, curso aparece na listagem do aluno."
    why_human: "Comportamento de visibilidade depende de sessao ativa no Supabase hospedado — nao testavel programaticamente sem servidor rodando."
  - test: "Admin navega a /admin/cursos/[slug], cria um modulo, adiciona duas aulas, clica seta para cima/baixo e confirma que a ordem muda na tela."
    expected: "Posicoes das aulas se invertem visivelmente na pagina apos recarregar."
    why_human: "Reorder e efeito visual em RSC — requer navegador real."
  - test: "Admin deleta uma aula. Consultar o banco: SELECT count(*) FROM lesson_progress WHERE lesson_id = <id deletado> deve retornar 0 linhas se nenhum aluno assistiu, ou > 0 se alguem assistiu — em ambos os casos a aula nao deve aparecer para o aluno mas o progresso deve ser preservado."
    expected: "Aula some da visao do aluno; lesson_progress nao e apagado."
    why_human: "Verificacao cruzada entre aplicacao e banco de dados — requer SQL no painel Supabase."
  - test: "Admin faz upload de um .pdf (deve passar) e de um .exe (deve ser rejeitado com mensagem em pt-BR)."
    expected: "PDF aceito; .exe retorna mensagem 'Tipo de arquivo nao suportado...'"
    why_human: "Requer browser com upload real; servidor de dev deve estar rodando."
  - test: "Admin acessa /admin/cursos/[slug]/alunos, busca por email de aluno existente, concede acesso. Depois busca por email novo (inexistente), envia convite. Conferir que pending_enrollments tem linha para o email novo."
    expected: "Aluno existente tem enrollment imediato; aluno novo tem linha em pending_enrollments."
    why_human: "Requer sessao de admin autenticada e banco de dados ativo."
  - test: "Acesse /?utm_source=test&utm_medium=manual&utm_campaign=phase2-verify, preencha e envie o formulario institucional. Verifique no painel Supabase: SELECT utm_source, utm_medium, utm_campaign FROM institutional_leads ORDER BY created_at DESC LIMIT 1;"
    expected: "Linha com utm_source='test', utm_medium='manual', utm_campaign='phase2-verify'."
    why_human: "Requer banco de dados ativo e validacao manual no painel Supabase."
  - test: "Verifique que /health ainda retorna {status, uptime, timestamp, version} (smoke test Phase 1 regressao)."
    expected: "JSON com status: 'ok' e campos esperados."
    why_human: "Requer servidor rodando."
  - test: "Admin marca um curso publicado como 'arquivado'. Aluno logado em /dashboard nao ve mais o curso. Verificar via SQL que enrollments e certificates do aluno permanecem intactos."
    expected: "Curso desaparece da listagem do aluno; dados de progresso e certificados preservados."
    why_human: "Requer sessao de aluno ativa e verificacao no banco."
---

# Phase 2: Catalog CRUD — Verification Report

**Phase Goal:** Admin da MDHE consegue criar e publicar um catalogo completo de cursos — com modulos, aulas e materiais — sem abrir o SQL Editor do Supabase.
**Verified:** 2026-04-28T10:50:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin cria curso com slug unico, define rascunho/publicado; curso aparece para aluno apenas quando `published_at IS NOT NULL` | VERIFIED | `getAvailableCourses` em `queries.ts:119-121` usa `.not("published_at","is",null).is("archived_at",null)`; `publishCourseAction` em `upsert-course.ts:196-199` set `published_at=now(), archived_at=null`; migration 0014 linha 19-21 adiciona coluna |
| 2 | Admin adiciona modulos, reordena aulas dentro de modulo, deleta aula sem perder historico de progresso | VERIFIED | `reorderLessonAction` em `update-lesson.ts:152-217` faz swap por posicao; `deleteLessonAction` em `update-lesson.ts:91-120` set `deleted_at=now()` (soft delete); `lesson_progress` nao e tocado; `getCourseWithContent` filtra `deleted_at` em `queries.ts:243-255` |
| 3 | Admin anexa PDF a aula; download autenticado; remover material nao quebra aulas | VERIFIED | `ALLOWED_MATERIAL_MIME_TYPES` em `storage.ts:20-30` com 9 tipos; `assertUploadable` em `storage.ts:91-106`; upload route `api/materials/upload/route.ts:48-51` chama `assertUploadable` com retorno 400 + pt-BR; 9 testes em `storage.test.ts` passando |
| 4 | Ao criar curso com slug existente, admin ve mensagem clara sem stack trace | VERIFIED | `formatSupabaseInsertOrUpdateError` em `upsert-course.ts:66-79` captura `error.code === "23505"` e retorna `"Ja existe um curso com este slug. Escolha outro slug."`; sem stack trace no `CourseFormState`; teste em `upsert-course.test.ts` verificado (5/5 green) |
| 5 | Admin arquiva curso; some da visao do aluno; certificados e progresso preservados | VERIFIED | `archiveCourseAction` em `upsert-course.ts:238-264` set `archived_at=now()`; RLS em migration 0014 linhas 160-170 filtra `archived_at IS NULL OR admin`; `getAvailableCourses` aplica `.is("archived_at",null)`; enrollments/certificates nao sao alterados |
| 6 | (ENR-03) Admin concede acesso a aluno existente (imediato) ou novo email (convite + pending_enrollment); reconciliacao no aceite do convite | VERIFIED | `grantEnrollmentAction` em `grant-enrollment.ts:118-158` insert com `source="admin_grant"` + catch 23505; `grantEnrollmentWithInviteAction` em `grant-enrollment.ts:160-210` insert em `pending_enrollments`; `convertPendingEnrollmentsForEmail` em `manage-pending-enrollment.ts` chamado por `accept-invite-form.tsx:221`; 18 testes passando |
| 7 | (MKT-02) UTMs capturados da URL; persistidos em `institutional_leads`; landing com 11+ secoes preservada | VERIFIED | `institutionalLeadSchema` em `institutional-lead-schema.ts:29-31` tem `utmSource/utmMedium/utmCampaign` com max 255; `submitInstitutionalLead` em `create-institutional-lead.ts:61-63` persiste os 3 campos; `page.tsx:46-54` e async + `await searchParams`; `InstitutionalLeadForm` em `page.tsx:317` recebe as 3 props; form tem 3 `input[type=hidden]` linhas 60-62; landing tem 11 `MarketingSection` + hero + CTA final = 13 secoes |

**Score:** 7/7 ROADMAP success criteria verificados automaticamente

---

### Required Artifacts

| Artifact | Status | Evidence |
|----------|--------|----------|
| `supabase/migrations/0014_catalog_metadata.sql` | VERIFIED | 171 linhas; 6 secoes: courses timestamps, modules/lessons soft-delete, UTMs, pending_enrollments, RLS update |
| `src/lib/database.types.ts` | VERIFIED | `published_at: string \| null` em courses Row/Insert/Update; `pending_enrollments` tabela completa com Relationships |
| `README.md` | VERIFIED | Linha 55 lista `0014_catalog_metadata.sql` com descricao completa |
| `src/lib/courses/schema.ts` | VERIFIED | `publishCourseSchema`, `archiveCourseSchema`, `unpublishCourseSchema` exportados linhas 162-171 |
| `src/lib/courses/queries.ts` | VERIFIED | `getAvailableCourses` com filtro student (`.not published_at`, `.is archived_at null`); `getAdminCourseList` sem filtro; `getAdminCourseBySlug`, `getAdminModuleWithLessons`, `getAdminLessonWithContext` |
| `src/app/actions/upsert-course.ts` | VERIFIED | `publishCourseAction`, `unpublishCourseAction`, `archiveCourseAction` exportados; todos chamam `requireAdminUser()` |
| `src/lib/courses/slugify.ts` | VERIFIED | Exporta `slugify(text)` com NFKD normalize; 7 testes em `slugify.test.ts` passando |
| `src/app/actions/update-module.ts` | VERIFIED | `updateModuleAction`, `deleteModuleAction` (soft delete), `reorderModuleAction` (neighbor swap); `SupabaseClient<Database>` tipado |
| `src/app/actions/update-lesson.ts` | VERIFIED | `updateLessonAction`, `deleteLessonAction` (soft delete), `restoreLessonAction`, `reorderLessonAction`; `SupabaseClient<Database>` tipado |
| `src/lib/materials/storage.ts` | VERIFIED | `ALLOWED_MATERIAL_MIME_TYPES` (Set com 9 MIMEs); `assertUploadable` com fallthrough para MIME vazio |
| `src/app/api/materials/upload/route.ts` | VERIFIED | `assertUploadable` importado e chamado; retorna 400 + pt-BR em falha |
| `src/components/admin/material-upload.tsx` | VERIFIED | Importa `ALLOWED_MATERIAL_MIME_TYPES`; constroi `accept=` a partir da constante; upload via fetch para `/api/materials/upload` |
| `src/components/admin/breadcrumb.tsx` | VERIFIED | Componente `Breadcrumb` exportado |
| `src/components/admin/status-badge.tsx` | VERIFIED | `StatusBadge` e `deriveCourseStatus` exportados |
| `src/components/admin/reorder-buttons.tsx` | VERIFIED | Componente `ReorderButtons` exportado |
| `src/components/admin/confirmation-dialog.tsx` | VERIFIED | Componente `ConfirmationDialog` exportado |
| `src/app/admin/page.tsx` | VERIFIED | `redirect("/admin/cursos")` — admin vai direto ao catalogo |
| `src/app/admin/cursos/page.tsx` | VERIFIED | RSC; chama `getAdminCourseList`; exibe `StatusBadge`; stats row; botao Novo curso |
| `src/app/admin/cursos/novo/page.tsx` | VERIFIED | RSC com `Breadcrumb` e `NewCourseForm` |
| `src/app/admin/cursos/[slug]/page.tsx` | VERIFIED | RSC; chama `getAdminCourseBySlug`; exibe `CourseEditForm`, modulos com `ModuleReorderRow` |
| `src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx` | VERIFIED | Arquivo existe (Glob confirmado) |
| `src/app/admin/cursos/[slug]/aulas/[lessonId]/page.tsx` | VERIFIED | Arquivo existe (Glob confirmado) |
| `src/app/actions/grant-enrollment.ts` | VERIFIED | `lookupProfileByEmailAction`, `grantEnrollmentAction`, `grantEnrollmentWithInviteAction`; catch 23505; `requireAdminUser` |
| `src/app/actions/manage-pending-enrollment.ts` | VERIFIED | `convertPendingEnrollmentsForEmail`; admin client; deleta pending apos criar enrollment |
| `src/app/admin/cursos/[slug]/alunos/page.tsx` | VERIFIED | RSC com `GrantEnrollmentDialog` importado; lista enrollments e pending |
| `src/components/admin/grant-enrollment-dialog.tsx` | VERIFIED | "use client"; usa `useActionState` com `lookupProfileByEmailAction` e `grantEnrollmentAction`; 5 estados de UI (idle, buscando, encontrado, nao-encontrado, ja-tem-acesso) |
| `src/app/auth/accept-invite/accept-invite-form.tsx` | VERIFIED | Linha 221: `void convertPendingEnrollmentsForEmail(currentUser.email)` chamado apos `updateUser` bem-sucedido |
| `src/lib/marketing/institutional-lead-schema.ts` | VERIFIED | `utmSource`, `utmMedium`, `utmCampaign` com `z.string().max(255).optional()` |
| `src/app/actions/create-institutional-lead.ts` | VERIFIED | Insert inclui `utm_source`, `utm_medium`, `utm_campaign` (linhas 61-63) |
| `src/app/page.tsx` | VERIFIED | `async function Home`; `await searchParams`; UTMs passados para `InstitutionalLeadForm` |
| `src/components/marketing/institutional-lead-form.tsx` | VERIFIED | 3 `input[type=hidden]` com `name=utmSource/utmMedium/utmCampaign` |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `upsert-course.ts` | `courses/schema.ts` | import `publishCourseSchema` | WIRED |
| `admin/cursos/page.tsx` | `courses/queries.ts` | `getAdminCourseList` | WIRED |
| `admin/cursos/[slug]/page.tsx` | `components/admin/breadcrumb.tsx` | import `Breadcrumb` | WIRED |
| `admin/cursos/page.tsx` | `components/admin/status-badge.tsx` | import `deriveCourseStatus, StatusBadge` | WIRED |
| `update-module.ts` | `modules/schema.ts` | import `updateModuleSchema` etc. | WIRED |
| `getCourseWithContent` | `lessons table` | JS filter `!lesson.deleted_at` (linhas 243-255) | WIRED |
| `api/materials/upload/route.ts` | `storage.ts` | import `assertUploadable` | WIRED |
| `material-upload.tsx` | `storage.ts` | import `ALLOWED_MATERIAL_MIME_TYPES` para `accept=` | WIRED |
| `grant-enrollment-dialog.tsx` | `grant-enrollment.ts` | `useActionState(lookupProfileByEmailAction)` | WIRED |
| `accept-invite-form.tsx` | `manage-pending-enrollment.ts` | `convertPendingEnrollmentsForEmail` chamado pos-updateUser | WIRED |
| `grant-enrollment.ts` | `pending_enrollments` DB | `adminClient.from("pending_enrollments").insert` | WIRED |
| `page.tsx` | `institutional-lead-form.tsx` | props `utmSource/utmMedium/utmCampaign` | WIRED |
| `create-institutional-lead.ts` | `institutional_leads` DB | insert com `utm_source/utm_medium/utm_campaign` | WIRED |
| `admin/page.tsx` | `/admin/cursos` | `redirect("/admin/cursos")` | WIRED |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `admin/cursos/page.tsx` | `courses` | `getAdminCourseList()` → `supabase.from("courses").select(...)` | Sim — query sem filtro de status | FLOWING |
| `getAvailableCourses` | cursos para aluno | `supabase.from("courses")...not("published_at","is",null).is("archived_at",null)` | Sim — query com filtros corretos | FLOWING |
| `getCourseWithContent` | modulos + aulas | query aninhada + filtro JS `!lesson.deleted_at` | Sim — soft-deleted excluidos | FLOWING |
| `grant-enrollment-dialog.tsx` | `foundProfile` | `lookupProfileByEmailAction` → `auth.admin.listUsers` + `profiles.select` | Sim — admin client query real | FLOWING |
| `institutional-lead-form.tsx` | `utmSource/utmMedium/utmCampaign` | `page.tsx` le `searchParams.utm_*`; props passados ao form; hidden inputs no POST | Sim — URL → server action → DB insert | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 98/98 testes Vitest passando | `npx vitest run` | 98 passed, 19 test files | PASS |
| Lint zero-warning | `npm run lint` | Saiu 0 (apenas aviso de data baseline, nao lint warning) | PASS |
| Typecheck limpo | `npm run typecheck` | Saiu 0 | PASS |
| `slugify("Gestao de Incidentes")` === `"gestao-de-incidentes"` | Vitest `slugify.test.ts` | 7/7 green | PASS |
| `assertUploadable` rejeita `application/zip` com pt-BR | Vitest `storage.test.ts` | 9/9 green | PASS |
| 23505 catch retorna mensagem pt-BR sem stack trace | Vitest `upsert-course.test.ts` | 5/5 green | PASS |
| `deleteLessonAction` faz soft delete (nao hard delete) | Vitest `manage-lesson.test.ts` | 4/4 green | PASS |
| `convertPendingEnrollmentsForEmail` converte e deleta pending | Vitest `manage-pending-enrollment.test.ts` | 6/6 green | PASS |

---

### Requirements Coverage

| Requirement | Plano | Descricao | Status | Evidencia |
|-------------|-------|-----------|--------|-----------|
| CAT-01 | 02-02 | Admin cria, edita e publica curso | SATISFIED | `createCourseAction`, `updateCourseAction`, `publishCourseAction` em `upsert-course.ts` |
| CAT-02 | 02-03 | Admin cria, edita, reordena, remove modulos | SATISFIED | `update-module.ts` com soft delete + reorder |
| CAT-03 | 02-03 | Admin cria, edita, reordena, remove aulas | SATISFIED | `update-lesson.ts` com soft delete + restore + reorder |
| CAT-04 | 02-04 | Admin anexa, edita, remove materiais validados | SATISFIED | `assertUploadable` + `material-upload.tsx` + upload route |
| CAT-05 | 02-02 | Curso visivel ao aluno somente com `published_at IS NOT NULL` | SATISFIED | `getAvailableCourses` filtro + RLS em 0014 |
| CAT-06 | 02-02 | Slugs unicos; admin recebe erro claro em colisao | SATISFIED | `formatSupabaseInsertOrUpdateError` captura 23505 + teste |
| CAT-07 | 02-02 | Arquivar curso sem perder historico | SATISFIED | `archiveCourseAction` + `getAvailableCourses` filtra `archived_at IS NULL` |
| ENR-03 | 02-06 | Admin concede acesso individual B2C/B2B | SATISFIED | `grant-enrollment.ts` + `manage-pending-enrollment.ts` + `accept-invite-form.tsx` |
| MKT-01 | 02-07 | Landing `/` com 11 secoes preservada | SATISFIED | 11 `MarketingSection` + hero + CTA final em `page.tsx` |
| MKT-02 | 02-07 | UTMs capturados e gravados em `institutional_leads` | SATISFIED | Schema + action + landing page async + hidden inputs |

---

### Anti-Patterns Found

Nenhum anti-pattern bloqueante encontrado. Varredura manual:
- Nenhum `return null` em componentes de renderizacao de dados
- Nenhum `TODO/FIXME/placeholder` nas 30+ arquivos verificados
- Nenhum estado hardcoded vazio passado como prop para renderizacao real
- O risco T-02-T6 (swap de posicao nao atomico) esta documentado no plano como "accepted low severity" — nao e um bloqueador

---

### Human Verification Required

As verificacoes abaixo requerem o servidor de desenvolvimento rodando e/ou acesso ao painel Supabase. Elas NAO bloqueiam a conclusao dos testes automatizados, mas DEVEM ser executadas antes de marcar a fase como "deployed to production".

#### 1. Smoke: criacao e publicacao de curso

**Test:** Admin acessa `/admin/cursos/novo`, cria curso como rascunho, confirma ausencia em `/dashboard`. Publica o curso, confirma aparicao em `/dashboard`.
**Expected:** Rascunho oculto; publicado visivel.
**Why human:** Requer sessao Supabase ativa e browser.

#### 2. Smoke: reordenacao de aulas

**Test:** Admin navega a `/admin/cursos/[slug]/modulos/[moduleId]`, cria duas aulas, clica na seta e confirma mudanca de ordem.
**Expected:** Posicoes das aulas se invertem.
**Why human:** Efeito visual em RSC — requer browser real.

#### 3. Integridade de progresso apos soft-delete

**Test:** Admin deleta uma aula que tem progresso de aluno. Consultar `SELECT count(*) FROM lesson_progress WHERE lesson_id = '<id>'` — linha deve existir mesmo apos delecao da aula.
**Expected:** Progresso preservado no banco; aula nao aparece para o aluno.
**Why human:** Verificacao cruzada entre aplicacao e banco Supabase.

#### 4. Upload MIME whitelist

**Test:** Admin em `/admin/cursos/[slug]/aulas/[lessonId]`, faz upload de arquivo `.pdf` (aceito) e de `.exe` (rejeitado).
**Expected:** PDF aceito com sucesso; `.exe` retorna mensagem em pt-BR "Tipo de arquivo nao suportado...".
**Why human:** Requer browser com file picker e servidor rodando.

#### 5. Grant enrollment — aluno existente e convite

**Test:** Admin em `/admin/cursos/[slug]/alunos`, busca email de aluno com conta, concede acesso. Depois busca email inexistente, envia convite. Verificar `SELECT * FROM pending_enrollments ORDER BY created_at DESC LIMIT 1`.
**Expected:** Aluno existente tem enrollment; email novo tem linha em `pending_enrollments`.
**Why human:** Requer banco ativo e autenticacao de admin.

#### 6. UTM capture end-to-end

**Test:** Acesse `/?utm_source=test&utm_medium=manual&utm_campaign=phase2-verify`, preencha e envie o formulario institucional. Verificar `SELECT utm_source, utm_medium, utm_campaign FROM institutional_leads ORDER BY created_at DESC LIMIT 1`.
**Expected:** `utm_source = 'test'`, `utm_medium = 'manual'`, `utm_campaign = 'phase2-verify'`.
**Why human:** Requer banco ativo e confirmacao manual.

#### 7. Arquivamento — visao do aluno

**Test:** Admin arquiva um curso publicado. Aluno logado acessa `/dashboard` — curso deve sumir. Verificar via SQL que `enrollments` e `course_certificates` do aluno permanecem intactos.
**Expected:** Curso some da listagem; dados preservados.
**Why human:** Requer sessoes de admin e aluno + SQL no painel.

#### 8. Regressao Phase 1 — /health

**Test:** `GET /health` retorna `{status, uptime, timestamp, version}`.
**Expected:** JSON com `status: "ok"`.
**Why human:** Requer servidor rodando.

---

### Gaps Summary

Nenhum gap tecnico encontrado. Todos os 7 criterios de sucesso do ROADMAP estao implementados, testados e com wiring verificado. Os 10 requisitos (CAT-01 a CAT-07, ENR-03, MKT-01, MKT-02) tem evidencia de implementacao no codigo.

Os itens de verificacao humana acima sao smoke tests de integracao de ponta a ponta — nao sao gaps de implementacao.

---

## Resumo em pt-BR

A **Fase 2 — Catalog CRUD** passou em todos os 7 criterios de sucesso automaticamente verificaveis:

1. **Curso create/publish/archive** — actions `publishCourseAction` e `archiveCourseAction` implementadas, testadas (5 testes green) e com filtro de visibilidade em `getAvailableCourses`.
2. **Modulos e aulas** — soft delete (nunca hard delete), reorder por swap de posicao, restauracao de aula; `getCourseWithContent` filtra registros com `deleted_at` para o aluno.
3. **Materiais** — MIME whitelist com 9 tipos no servidor (`assertUploadable`) e cliente (`accept=`); 9 testes green.
4. **Colisao de slug** — erro 23505 capturado, mensagem em pt-BR sem stack trace; teste unitario confirma.
5. **Archive sem perda de historico** — `archived_at` set via action; RLS impede aluno de ver; enrollments e certificates preservados.
6. **ENR-03 grant flow** — grant direto (aluno existente) e via convite (pending_enrollment); reconciliacao automatica no aceite do convite; 18 testes green.
7. **MKT UTM capture** — schema Zod com max 255, landing async com searchParams, hidden inputs, action persiste os 3 campos.

**Checks automaticos:** 98/98 testes Vitest; lint zero-warning; typecheck limpo.

**Proximo passo:** Executar os 8 smoke tests de UAT humano listados acima (requerem servidor rodando e acesso ao painel Supabase). Eles nao sao gaps — sao verificacoes de integracao de ponta a ponta que nao podem ser feitas sem um ambiente ativo.

---

_Verified: 2026-04-28T10:50:00Z_
_Verifier: Claude (gsd-verifier)_
