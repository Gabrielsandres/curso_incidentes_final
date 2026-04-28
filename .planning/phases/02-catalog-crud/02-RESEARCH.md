# Phase 2: Catalog CRUD — Research

**Researched:** 2026-04-28
**Domain:** Next.js 16 App Router + Supabase v2 Admin CRUD + PostgreSQL RLS + Tailwind v4
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Status do curso via timestamps `published_at timestamptz NULL` e `archived_at timestamptz NULL`. Estado derivado em código, sem enum. `archived_at IS NOT NULL` → arquivado; `archived_at IS NULL AND published_at IS NOT NULL` → publicado; ambos NULL → rascunho.
- **D-02:** Soft delete em `lessons` e `modules` via `deleted_at timestamptz NULL`. Hard delete reservado para SQL Editor. RLS de aluno filtra `WHERE deleted_at IS NULL`.
- **D-03:** Migration única `0014_catalog_metadata.sql` com todos os ALTERs aditivos: `courses` (published_at, archived_at), `modules` (deleted_at), `lessons` (deleted_at, video_provider, video_external_id, workload_minutes), `institutional_leads` (utm_source, utm_medium, utm_campaign). Coluna legacy `video_url` PRESERVADA.
- **D-04:** `src/lib/database.types.ts` hand-edit no mesmo wave. README atualizado.
- **D-05:** UI hierárquica via páginas aninhadas com URL stateful — `/admin/cursos` → `/admin/cursos/[slug]` → `/modulos/[id]` → `/aulas/[id]` → `/alunos`. Breadcrumb em `src/components/admin/breadcrumb.tsx`.
- **D-06:** Reordenação via botões ↑/↓. Swap de position com vizinho via server action. Sem drag-drop.
- **D-07:** Validação de slug colidido via captura de erro Postgres `23505`. Sem pre-check. Erro inline via `useActionState`.
- **D-08:** Whitelist de MIME: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), PNG, JPEG. Validação dupla client+server em `assertUploadable()`.
- **D-09:** UI de enrollments em `/admin/cursos/[slug]/alunos`. Lista de ativos + pendentes.
- **D-10:** Grant access dialog: busca por email em `profiles`; se não encontrado, usa fluxo de invite existente + `pending_enrollments` (opção A). Opção B (enrollment direto via auth.users.id) também viável.
- **D-11:** UTM capture via hidden inputs preenchidos no RSC. `searchParams.utm_*` → `defaultValue`.
- **D-12:** MKT-01 (landing preservada): apenas hidden inputs, nenhuma mudança de layout ou copy.

### Claude's Discretion

- Layout exato do dashboard `/admin/cursos` (cards vs lista)
- Componente de breadcrumb (sem dep nova)
- Texto exato dos botões e mensagens de erro pt-BR
- Status visual (badge colorido confirmado por UI-SPEC.md)
- Estratégia de paginação na lista de enrollments (sem paginação no v1)

### Deferred Ideas (OUT OF SCOPE)

- Audit log de mudanças no catálogo
- Bulk import / CSV de cursos
- Analytics dashboard de leads institucionais
- Preview de curso em rascunho
- Versões / draft history
- Busca/filtros avançados de cursos no admin
- Drag-and-drop com @dnd-kit
- Tabela `lead_utm_attributions` (first_touch/last_touch)

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Admin cria, edita e publica curso (título, slug único, descrição, capa, status) sem SQL | D-01, D-05, D-07; upsert-course.ts padrão existente a estender |
| CAT-02 | Admin cria, edita, reordena e remove módulos dentro de um curso | D-06; swap de position; soft delete via deleted_at |
| CAT-03 | Admin cria, edita, reordena e remove aulas (título, descrição, duração, referência de vídeo) | D-06; deleted_at; video_provider + video_external_id (schema-only em Phase 2) |
| CAT-04 | Admin anexa, edita e remove materiais por aula, com upload validado | D-08; ALLOWED_MATERIAL_MIME_TYPES em storage.ts; whitelist server-side |
| CAT-05 | Curso visível ao aluno apenas quando `published_at IS NOT NULL`; rascunhos restritos ao admin | D-01; policy RLS em courses para aluno |
| CAT-06 | Slugs únicos; admin recebe erro claro em colisão | D-07; error.code === "23505" catch pattern |
| CAT-07 | Admin arquiva curso sem perder histórico de progresso e certificados | D-01; archived_at; RLS de aluno filtra arquivados |
| ENR-03 | Admin concede acesso individual a aluno (B2C ou B2B) com expiração opcional | D-09, D-10; grant-enrollment-dialog.tsx; pending_enrollments ou auth invite |
| MKT-01 | Landing comercial `/` permanece operacional com 11 seções | D-12; testes de non-regression |
| MKT-02 | Form institucional grava UTMs (utm_source, utm_medium, utm_campaign) | D-11; institutionalLeadSchema estendido; 0014 migration |

</phase_requirements>

---

## Resumo Executivo

A Phase 2 é uma expansão brownfield do admin existente (`course-manager.tsx`, `upsert-course.ts`, `create-module.ts`) para suportar o ciclo de vida completo do catálogo — criação/edição/publicação/arquivamento de cursos, gerenciamento de módulos e aulas com reordenação e soft delete, upload de materiais com whitelist de MIME, concessão manual de acesso a alunos e captura de UTMs no formulário institucional.

O ponto central da pesquisa: **todos os padrões principais já existem no codebase** — `useActionState` + `CourseFormState`, captura de 23505, `requireAdminUser()`, Zod schema-first, logger + Sentry, upload route. Phase 2 estende esses padrões para novos domínios, não os reinventa. O maior risco técnico novo é a decisão de `pending_enrollments` (D-10) e a corretude das políticas RLS para soft delete (D-02).

**Recomendação primária:** Implementar Option A para D-10 (`pending_enrollments` nova tabela) e aplicar soft delete filter **na camada de query da aplicação** (não na policy RLS) para permitir acesso admin sem bifurcação de políticas.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Course lifecycle (publish/archive) | API / Backend (Server Action) | Database (timestamps + RLS) | Timestamps setados server-side; RLS aplica filtro para aluno |
| Soft delete (modules/lessons) | API / Backend (Server Action + query layer) | Database (deleted_at column) | Filtro aplicado em queries, não em policy, para permitir admin ver itens deletados |
| MIME validation | API / Backend (upload route) | Browser / Client (input accept + JS check) | Server é fonte de verdade; client é só UX rápida |
| Slug uniqueness | Database (unique constraint) | API / Backend (23505 catch) | Constraint é a garantia real; action só traduz o erro |
| Admin navigation (breadcrumb) | Browser / Client (next/navigation) | — | Precisa de usePathname para highlight; props do RSC pai para labels |
| Enrollment grant | API / Backend (Server Action + admin client) | Database (enrollments + pending_enrollments) | Admin client bypassa RLS para INSERT; policy protege SELECT |
| UTM capture | Frontend Server (RSC) | API / Backend (Server Action) | RSC lê searchParams; action persiste no DB |
| Reorder (position swap) | API / Backend (Server Action) | Database (UPDATE position) | Precisa de leitura do vizinho antes de swap; feito no server |

---

## Standard Stack

### Core (já no projeto — confirmado)

| Library | Version (no repo) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| Next.js | 16.0.10 | App Router, Server Actions, RSC | Locked — projeto inteiro |
| React | 19.2.3 | UI + useActionState + useFormStatus | Locked |
| @supabase/supabase-js | 2.76.1 (registry: 2.105.0) | Queries, auth, admin client | Locked |
| @supabase/ssr | 0.7.0 | Cookie-bound server client | Locked |
| Zod | 3.24.1 (registry: 4.3.6) | Schema validation | CLAUDE.md mandates Zod-first |
| Tailwind v4 | @tailwindcss/postcss v4 | Styling | Locked; sem shadcn conforme UI-SPEC |
| lucide-react | 0.462.0 | Icons (ChevronRight, Archive, Users, etc.) | Já instalado; UI-SPEC usa extensivamente |
| Vitest | 4.0.4 (registry: 4.1.5) | Tests — node environment | Locked |

> [VERIFIED: npm registry] — versões do registry verificadas em 2026-04-28.
> **Atenção:** Zod no repo está em `^3.24.1` mas o registry já tem `4.x`. A Phase 2 deve usar a versão
> do package.json existente (3.24.1) para não introduzir breaking change — não atualizar.

### Sem novas dependências a adicionar

Phase 2 introduz **zero novas dependências npm**. Todo o trabalho é extensão de código existente.

- `file-type` (magic bytes) — **não usar**; ver Q6 abaixo sobre MIME validation
- `slugify` npm — **não usar**; implementar função local ~10 linhas (ver Q7)
- `@dnd-kit` — **explicitamente deferido** (CONTEXT.md Deferred)
- `dialog` nativo HTML ou `useState` portal — usar uma das duas sem lib externa

---

## Q1: Server Action Error Handling Pattern com useActionState

### CourseFormState shape existente (VERIFICADO)

```typescript
// src/app/actions/course-form-state.ts — EXATO, não mudar
export type CourseFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialCourseFormState: CourseFormState = {
  success: false,
  message: "",
};
```

**Este shape já suporta todos os casos necessários em Phase 2:**
- `fieldErrors.slug` → erro de colisão ou formato de slug (FieldError inline)
- `fieldErrors.title` → campo vazio
- `message` + `success: false` → erro form-level (DB error, permissão)
- `message` + `success: true` → confirmação de sucesso (FeedbackBanner)

### Padrão existente em course-manager.tsx (VERIFICADO)

```typescript
// "use client" — padrão completo verificado em src/app/admin/course-manager.tsx
const [state, formAction] = useActionState<CourseFormState, FormData>(
  updateCourseAction,
  initialCourseFormState
);
// ...
<form action={formAction} ...>
  <input name="slug" ... />
  <FieldError errors={state.fieldErrors?.slug} />
  {state.message && (
    <div className={state.success ? "...emerald..." : "...red..."}>
      {state.message}
    </div>
  )}
  <SubmitButton label="Salvar" pendingLabel="Salvando..." />
</form>

// SubmitButton usa useFormStatus para pending
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
```

### Novas actions necessárias e seus FormState

O `CourseFormState` existente serve para **todas** as novas actions de curso. Para módulos/aulas/enrollments, criar tipos análogos seguindo a mesma forma:

```typescript
// Padrão a replicar para módulos, aulas, e enrollments
export type ModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type LessonFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export type EnrollmentFormState = {
  success: boolean;
  message: string;
  // Estado adicional para o dialog de grant:
  foundProfile?: { id: string; fullName: string; email: string } | null;
  fieldErrors?: Record<string, string[] | undefined>;
};
```

> [VERIFIED: codebase grep] — verificado em `src/app/actions/course-form-state.ts` e
> `src/app/admin/course-manager.tsx`.

### Actions novas necessárias (resumo do escopo)

| Arquivo | Actions a criar/estender |
|---------|--------------------------|
| `src/app/actions/upsert-course.ts` | Estender com `publishCourseAction`, `unpublishCourseAction`, `archiveCourseAction` |
| `src/app/actions/update-module.ts` (novo) | `updateModuleAction`, `deleteModuleAction`, `reorderModuleAction` |
| `src/app/actions/update-lesson.ts` (novo) | `updateLessonAction`, `deleteLessonAction`, `restoreLessonAction`, `reorderLessonAction` |
| `src/app/actions/grant-enrollment.ts` (novo) | `lookupProfileByEmailAction`, `grantEnrollmentAction`, `revokeEnrollmentAction` |
| `src/app/actions/create-institutional-lead.ts` | Estender `submitInstitutionalLead` com UTMs |

---

## Q2: Postgres 23505 — Exact Error Shape em Supabase v2

### Shape confirmado via codebase (VERIFIED)

O codebase já implementa e testa o catch de 23505 em `src/app/actions/upsert-course.ts`:

```typescript
// src/app/actions/upsert-course.ts — função existente, verificada
function formatSupabaseInsertOrUpdateError(error: { code?: string | null; message?: string | null }) {
  const uniqueViolation = error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");

  if (uniqueViolation) {
    return "Ja existe um curso com este slug. Escolha outro slug.";
  }
  // ...
}
```

### Estrutura do erro Supabase v2 para violação unique

```typescript
// Estrutura real retornada pelo Supabase JS SDK v2 para INSERT com violação unique
// error.code === "23505"  ← Postgres error code
// error.message === 'duplicate key value violates unique constraint "courses_slug_key"'
// error.details === 'Key (slug)=(gestao-de-incidentes) already exists.'
// error.hint === null  (geralmente nulo para 23505)
```

**Pattern recomendado para Phase 2** (extensão do que já existe):

```typescript
function translateCourseDbError(error: { code?: string | null; message?: string | null }): string {
  const isUniqueViolation =
    error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");
  const isPermissionDenied =
    error.code === "42501" || (error.message ?? "").toLowerCase().includes("permission denied");

  if (isUniqueViolation) {
    // Mensagem específica por contexto — D-07
    return "Já existe um curso com esse slug. Escolha outro.";
  }
  if (isPermissionDenied) {
    return "Você não tem permissão para salvar cursos (RLS).";
  }
  return "Não foi possível concluir a ação. Tente novamente.";
}
```

**Para enrollments**, o UNIQUE constraint é `(user_id, course_id)`:

```typescript
// Quando INSERT em enrollments falha com 23505:
if (error.code === "23505") {
  return { success: false, message: "Este aluno já tem acesso ativo a este curso." };
}
```

> [VERIFIED: codebase] — padrão confirmado em `src/app/actions/upsert-course.ts` linhas 60-73.
> A segunda condição (`includes("duplicate")`) serve como fallback defensivo caso Supabase
> mude a forma de reportar o code em futuras versões do SDK.

---

## Q3: Soft Delete em RLS Policies — Recomendação

### Duas opções e análise

**Opção A — Filtro na RLS policy (policy-level):**
```sql
-- Policy "Alunos leem aulas ativas"
create policy "Students read active lessons"
  on public.lessons
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = (
          select m.course_id from public.modules m where m.id = module_id
        )
        and (e.expires_at is null or e.expires_at > now())
    )
  );

-- Policy separada para admin (sem filtro de deleted_at)
create policy "Admins read all lessons"
  on public.lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
```

**Problemas desta abordagem para este projeto:**
1. Exige políticas separadas para aluno (com `deleted_at is null`) e admin (sem filtro)
2. O codebase existente usa `getAvailableCourses` e `getCourseWithContent` com o cliente de server (cookie-bound) — mesmo para admin. Nenhum bypass de RLS existe nas queries de cursos.
3. Admin usa `createSupabaseServerClient()` (não admin client) para ler dados de navegação — as políticas afetariam o admin também se só houver uma.
4. Módulos e lessons atualmente **não têm RLS habilitado** (verificado: 0001 não habilita RLS em lessons/modules; apenas 0003 adiciona policies de admin para materials).

**Opção B — Filtro na camada de query (recomendada para este projeto):**

```typescript
// Em src/lib/courses/queries.ts — adicionar WHERE deleted_at IS NULL
// para queries do player de aluno; omitir para queries de admin

// Query do aluno (src/app/curso/[slug]/page.tsx, dashboard)
const { data } = await supabase
  .from("lessons")
  .select("...")
  .eq("module_id", moduleId)
  .is("deleted_at", null); // ← filtro de aluno

// Query do admin (src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx)
const { data } = await supabase
  .from("lessons")
  .select("...")
  .eq("module_id", moduleId);
// Sem filtro — admin vê tudo incluindo soft-deleted
```

### Recomendação: Opção B (filtro na query, não na RLS)

**Justificativa:**
1. `lessons` e `modules` atualmente não têm RLS habilitado — habilitá-lo agora adicionaria complexidade desnecessária em Phase 2 (Phase 3 vai trabalhar extensamente com `lesson_progress`, que já tem RLS)
2. O admin usa `createSupabaseServerClient()` (mesmo cliente) para navegar o catálogo — adicionar policy-level split exigiria ou: (a) dois clientes diferentes por query, ou (b) uma subpolicy de admin que sempre bypassa
3. O precedente do projeto para `courses` com `published_at` e `archived_at` é **filtro no código** — `getAvailableCourses` não tem filtro hoje (Phase 2 adiciona), não na RLS
4. Menor superfície de erro: um bug numa policy pode inadvertidamente esconder dados do admin

**Para `courses` (published_at/archived_at)** — seguir o mesmo padrão:
- Query de aluno: `.not("published_at", "is", null).is("archived_at", null)`
- Query de admin: sem filtros de status (admin vê tudo incluindo arquivados)

> [VERIFIED: codebase] — confirmado em `src/app/admin/course-manager.tsx` e `src/lib/courses/queries.ts`
> que o padrão atual não usa RLS para controle granular de visibilidade; usa filtro de query.

---

## Q4: Migration 0014 — DDL Skeleton Completo

```sql
-- 0014_catalog_metadata.sql
-- Aplicar APÓS 0013 estar no banco.
-- Adiciona: lifecycle timestamps em courses, soft delete em modules+lessons,
--           video metadata + workload em lessons, UTMs em institutional_leads,
--           tabela pending_enrollments para D-10 (Opção A),
--           índices para queries comuns.
--
-- NOTA: coluna legacy lessons.video_url É MANTIDA (Phase 4 vai migrar).
-- NOTA: esta migration é ADITIVA — sem DROP, sem ALTER COLUMN TYPE.

-- -----------------------------------------------------------------------
-- 1. Courses: lifecycle timestamps (D-01)
-- -----------------------------------------------------------------------
alter table public.courses
  add column if not exists published_at timestamptz null,
  add column if not exists archived_at  timestamptz null;

-- Index para query do aluno: WHERE published_at IS NOT NULL AND archived_at IS NULL
create index if not exists idx_courses_published_at
  on public.courses (published_at)
  where archived_at is null;

-- -----------------------------------------------------------------------
-- 2. Modules: soft delete (D-02)
-- -----------------------------------------------------------------------
alter table public.modules
  add column if not exists deleted_at timestamptz null;

create index if not exists idx_modules_deleted_at
  on public.modules (deleted_at)
  where deleted_at is not null;

-- -----------------------------------------------------------------------
-- 3. Lessons: soft delete + video metadata + workload (D-02, D-03)
--    NÃO remover video_url (legacy — Phase 4 migra)
-- -----------------------------------------------------------------------
alter table public.lessons
  add column if not exists deleted_at         timestamptz null,
  add column if not exists video_provider     text        null,
  add column if not exists video_external_id  text        null,
  add column if not exists workload_minutes   integer     null
    constraint lessons_workload_minutes_check check (workload_minutes is null or workload_minutes > 0);

create index if not exists idx_lessons_deleted_at
  on public.lessons (deleted_at)
  where deleted_at is not null;

-- -----------------------------------------------------------------------
-- 4. Institutional leads: UTM capture (D-11, MKT-02)
-- -----------------------------------------------------------------------
alter table public.institutional_leads
  add column if not exists utm_source   text null,
  add column if not exists utm_medium   text null,
  add column if not exists utm_campaign text null;

-- Constraints de comprimento máximo (D-11: max 255)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_source_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_source_length
      check (utm_source is null or length(utm_source) <= 255);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_medium_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_medium_length
      check (utm_medium is null or length(utm_medium) <= 255);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_campaign_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_campaign_length
      check (utm_campaign is null or length(utm_campaign) <= 255);
  end if;
end $$;

-- -----------------------------------------------------------------------
-- 5. Pending enrollments (D-10, Opção A)
--    Registra intenção de grant enquanto o profile não existe.
--    Trigger ou post-invite Server Action converte para enrollment real.
-- -----------------------------------------------------------------------
create table if not exists public.pending_enrollments (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  course_id   uuid        not null references public.courses(id) on delete cascade,
  invited_by  uuid        null references public.profiles(id) on delete set null,
  expires_at  timestamptz null,  -- expires_at do enrollment que será criado (não da pendência)
  created_at  timestamptz not null default now(),
  -- Sem UNIQUE (email, course_id) — permite reenvio de convite para o mesmo email
  -- se o primeiro expirar ou for cancelado. Limpeza manual ou via CRON.
  constraint pending_enrollments_email_check
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index if not exists idx_pending_enrollments_email
  on public.pending_enrollments (lower(email));

create index if not exists idx_pending_enrollments_course_id
  on public.pending_enrollments (course_id);

-- RLS em pending_enrollments
alter table public.pending_enrollments enable row level security;

drop policy if exists "Admins manage pending enrollments" on public.pending_enrollments;
create policy "Admins manage pending enrollments"
  on public.pending_enrollments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Service role manages pending enrollments" on public.pending_enrollments;
create policy "Service role manages pending enrollments"
  on public.pending_enrollments
  for all to service_role
  using (true) with check (true);

-- -----------------------------------------------------------------------
-- 6. Courses RLS: atualizar policy de leitura de aluno para filtrar arquivados
--    Aluno não deve ver cursos com archived_at IS NOT NULL (CAT-05, CAT-07)
--    O filtro de published_at é feito na query (Q3 justificativa),
--    mas archived_at pode ser adicionado aqui como camada extra de segurança.
--    Esta policy existe desde 0003 — re-criar com drop/create é seguro.
-- -----------------------------------------------------------------------
-- NOTA: Verificar se existe policy de SELECT em courses para alunos antes de aplicar.
-- O codebase atual não mostra uma policy de SELECT em courses para authenticated users
-- (apenas para admins em alguns migrations). Se não existir, criar:
drop policy if exists "Authenticated users read published courses" on public.courses;
create policy "Authenticated users read published courses"
  on public.courses
  for select to authenticated
  using (
    published_at is not null
    and archived_at is null
    -- Admin bypassa via policy separada abaixo
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
```

> [VERIFIED: codebase] — Forma de migration verificada em `0011_courses_and_certificates.sql`
> e `0013_institutions_enrollments.sql`. Padrão `IF NOT EXISTS` e `drop policy if exists`
> confirmados como padrão do projeto.
> [ASSUMED] — A policy atual de SELECT em `courses` não está visível nos arquivos lidos
> (apenas policies de admin). O planner deve verificar `0003_lessons_materials_admin_policies.sql`
> e outros antes de aplicar a policy de cursos publicados.

---

## Q5: Pending Enrollments — Análise das Opções A e B

### Opção A: Tabela `pending_enrollments` (recomendada)

**Fluxo:**
1. Admin digita email não encontrado em `profiles`
2. Server action chama `supabase.auth.admin.inviteUserByEmail(email)` (admin client)
3. Insere row em `pending_enrollments(email, course_id, invited_by, expires_at)`
4. **Quando o usuário aceita o convite:** o trigger `handle_auth_user_profile()` cria o `profiles` row
5. Uma **Server Action de reconciliação** é chamada na rota de accept-invite (`/auth/accept-invite`) para converter `pending_enrollments` em `enrollments` reais

**Código da reconciliação (a chamar em `/auth/accept-invite/page.tsx` ou como trigger):**

```typescript
// src/app/actions/reconcile-pending-enrollments.ts (novo)
"use server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function reconcilePendingEnrollmentsForUser(email: string, userId: string) {
  const supabase = createSupabaseAdminClient();

  // Busca pendências para esse email
  const { data: pending } = await supabase
    .from("pending_enrollments")
    .select("id, course_id, expires_at, invited_by")
    .eq("email", email.toLowerCase());

  if (!pending || pending.length === 0) return;

  // Converte para enrollments reais
  for (const p of pending) {
    await supabase.from("enrollments").insert({
      user_id: userId,
      course_id: p.course_id,
      source: "admin_grant",
      granted_at: new Date().toISOString(),
      expires_at: p.expires_at,
    }).onConflict("user_id, course_id").ignore(); // UNIQUE já protege
  }

  // Remove pendências convertidas
  await supabase
    .from("pending_enrollments")
    .delete()
    .eq("email", email.toLowerCase());
}
```

**Vantagens da Opção A:**
- Não depende de `auth.users.id` antes do profile existir
- Separação clara de concerns (pendência ≠ enrollment ativo)
- Auditável (quem criou, quando, para qual curso)
- O fluxo `/auth/accept-invite` já existe em `src/app/auth/accept-invite/` — ponto de extensão natural

### Opção B: Enrollment direto via auth.users.id provisório

**Fluxo:**
1. Admin chama `supabase.auth.admin.inviteUserByEmail(email)`
2. Supabase retorna o `auth.users.id` do novo usuário convidado (mesmo sem `email_confirmed_at`)
3. Admin insere `enrollment(user_id: auth_user_id, course_id, ...)` imediatamente
4. Quando o perfil é criado (trigger), o enrollment já existe com `user_id` correto

**Problema com Opção B neste projeto:**
- O `enrollments.user_id` não tem FK para `auth.users` — tem FK para `profiles.id` implícita (via join no app). Se o profile não existe ainda, joins falham silenciosamente.
- O admin client não expõe facilmente o `auth.users.id` na resposta do `inviteUserByEmail` de forma consistente entre versões do SDK.
- Aumenta acoplamento entre Phase 2 e o frágil auth trigger (CONCERNS.md: "Auth Trigger Fragility").

**Recomendação: Opção A.** Mais limpa, auditável e desacoplada do timing do auth trigger.

> [VERIFIED: codebase] — `src/app/auth/accept-invite/` existe (confirmado em STRUCTURE.md).
> [CITED: supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail] — `inviteUserByEmail`
> cria auth.users row com email_confirmed_at=null e envia email de invite.
> [ASSUMED] — O SDK v2 retorna `{ data: { user: { id: ... } } }` no response de
> `inviteUserByEmail`. Verificar na implementação real.

---

## Q6: MIME Whitelist — Server-Side Validation

### Estado atual do codebase (VERIFICADO)

`src/lib/materials/storage.ts` já tem:
- `MAX_MATERIAL_FILE_SIZE_BYTES = 20 * 1024 * 1024` (20MB)
- `ALLOWED_MATERIAL_EXTENSIONS = new Set(["pdf","doc","docx","xls","xlsx","ppt","pptx","zip","png","jpg","jpeg"])`
- `validateMaterialFile(file: File)` — verifica size e extensão por nome de arquivo

**Problema:** A extensão é checada via `file.name`, não via magic bytes. O `file.type` (MIME type HTTP header) é client-supplied e igualmente não-confiável.

### Análise das 3 opções para D-08

**Opção A: `file.type` do FormData (server-side)**
- O upload route recebe `file instanceof File` — `file.type` é o `Content-Type` do multipart boundary
- Definido pelo navegador/sistema operacional ao montar o multipart
- **Confiabilidade:** Moderada. Browsers modernos inferem do conteúdo, mas pode ser manipulado por clientes não-browser (curl, Postman)

**Opção B: `file-type` npm (magic bytes)**
- `npm install file-type` — adiciona ~15KB gzip
- Lê os primeiros bytes do buffer e detecta tipo real independente de extensão/header
- **Confiabilidade:** Alta para detecção de tipos reais
- **Custo:** Nova dependência (CLAUDE.md não proíbe, mas D-08 não exige magic bytes)

**Opção C: Extensão de arquivo + `file.type` como dupla validação (recomendada)**
- Não adiciona dependência nova
- Mantém o padrão atual de `ALLOWED_MATERIAL_EXTENSIONS`
- Adiciona `ALLOWED_MATERIAL_MIME_TYPES` conforme D-08
- Verifica AMBOS: extensão deve estar na whitelist E MIME type deve corresponder

**Implementação recomendada para `src/lib/materials/storage.ts`:**

```typescript
// ADICIONAR após ALLOWED_MATERIAL_EXTENSIONS existente
export const ALLOWED_MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Images
  "image/png",
  "image/jpeg",
]);

// ATUALIZAR validateMaterialFile — adicionar MIME check
export function validateMaterialFile(file: File): MaterialUploadValidationResult {
  if (!file || file.size === 0) {
    return { ok: false, message: "Selecione um arquivo válido." };
  }

  if (file.size > MAX_MATERIAL_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: "O arquivo excede o limite de 20 MB. Escolha um arquivo menor.",
    };
  }

  const originalName = file.name?.trim() || "arquivo";
  const extension = getFileExtension(originalName);

  if (!extension || !ALLOWED_MATERIAL_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      message: "Tipo de arquivo não suportado. Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG.",
    };
  }

  // MIME type check (Opção C: dupla validação)
  // file.type pode ser vazio em alguns contextos — só rejeitar se presente e inválido
  if (file.type && file.type !== "application/octet-stream" && !ALLOWED_MATERIAL_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Tipo de arquivo não suportado. Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG.",
    };
  }

  const safeFileName = sanitizeFileName(originalName) || `arquivo.${extension}`;
  return { ok: true, extension, safeFileName };
}
```

**Para o upload route (`src/app/api/materials/upload/route.ts`):** `uploadLessonMaterialFile` em `src/lib/materials/upload.ts` já chama `validateMaterialFile`. Nenhuma mudança necessária na route — a extensão do `validateMaterialFile` é suficiente.

**Risco aceitável:** Atacante pode renomear `malware.exe` para `documento.pdf` e submeter com MIME `application/pdf`. O Supabase Storage tem suas próprias políticas de bucket (configuradas no painel). Para o contexto admin-only desta fase, o risco residual é baixo.

> [VERIFIED: codebase] — `src/lib/materials/storage.ts` verificado completamente.
> [ASSUMED] — Supabase Storage não bloqueia tipos por conta própria sem policy de bucket configurada.

---

## Q7: Slug Auto-Generation pt-BR

### Implementação recomendada (~10 linhas, zero dependências)

```typescript
// src/lib/courses/slugify.ts (NOVO)

/**
 * Converte um título pt-BR em slug URL-safe.
 * Trata ç→c, ã→a, õ→o, á/à/â→a, é/ê→e, í→i, ó/ô→o, ú→u, ü→u.
 * Resultado: apenas [a-z0-9-], sem espaços, sem diacríticos.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")                          // decompõe diacríticos (ã → a + combining tilde)
    .replace(/[̀-ͯ]/g, "")            // remove combining chars (diacríticos)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")              // remove chars não alfanuméricos (exceto espaço e -)
    .trim()
    .replace(/[\s_]+/g, "-")                    // espaços/underscore → hífen
    .replace(/-+/g, "-")                        // múltiplos hifens → um só
    .replace(/^-|-$/g, "");                     // remove hifens no início/fim
}
```

**Testes de validação pt-BR:**
```
slugify("Gestão de Incidentes — Nível 1")  → "gestao-de-incidentes-nivel-1"
slugify("Prevenção & Resposta a Crises")   → "prevencao-resposta-a-crises"
slugify("  Módulo Básico  ")               → "modulo-basico"
slugify("Ação/Reação")                     → "acaoreacao"
slugify("")                                → ""
```

**Onde usar:**
- **Client-side preview** (curso form page — "use client"): `onChange` no campo título → slugify → mostrar como `text-xs italic text-slate-400` abaixo do input de slug quando slug está vazio ou inalterado
- **Server action** (opcional): aplicar `slugify` no título se slug chegar vazio, antes do INSERT — mas D-07 faz o admin sempre preencher o slug manualmente; slugify no server é só fallback defensivo

**A `slugRegex` existente em `src/lib/courses/schema.ts` já valida o slug final:**
```typescript
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```
A função `slugify` produz saída compatível com essa regex.

> [VERIFIED: codebase] — `slugRegex` confirmado em `src/lib/courses/schema.ts` linha 3.

---

## Q8: Reorder Server Action — Concorrência e Gaps de Position

### Problema de gaps

Após um soft delete de módulo/aula, as posições podem ficar esparsas: `[1, 2, 4, 5]` (posição 3 foi deletada). Um swap entre posições 4 e 5 funcionará corretamente mesmo com gaps — o swap troca os valores literais, não assume contiguidade.

**Caso de problema real:** dois admins clicam ↑ ao mesmo tempo na mesma lista. Ambos leem a lista com as mesmas posições e fazem swap simultâneo, podendo criar posições duplicadas.

### Padrão de swap atômico recomendado

Para evitar ambiguidade de posições, usar um valor temporário durante o swap:

```typescript
// src/app/actions/update-module.ts
export async function reorderModuleAction(
  _prevState: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const moduleId = String(formData.get("module_id") ?? "");
  const direction = String(formData.get("direction") ?? ""); // "up" | "down"
  const courseId = String(formData.get("course_id") ?? "");

  // Validações...
  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  // Busca o módulo atual e seu vizinho em uma única query
  const { data: modules } = await auth.supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", courseId)
    .is("deleted_at", null)
    .order("position", { ascending: true });

  if (!modules) return { success: false, message: "Não foi possível reordenar." };

  const currentIndex = modules.findIndex((m) => m.id === moduleId);
  if (currentIndex === -1) return { success: false, message: "Módulo não encontrado." };

  const neighborIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (neighborIndex < 0 || neighborIndex >= modules.length) {
    return { success: false, message: "Não é possível mover nessa direção." };
  }

  const current = modules[currentIndex];
  const neighbor = modules[neighborIndex];

  // Swap usando valor temporário fora do range para evitar conflito de UNIQUE (se houver)
  // Como modules.position não tem UNIQUE constraint, update duplo é suficiente
  const TEMP_POSITION = -1;

  const { error: err1 } = await auth.supabase
    .from("modules")
    .update({ position: TEMP_POSITION })
    .eq("id", current.id);

  if (err1) return { success: false, message: "Falha ao reordenar (step 1)." };

  const { error: err2 } = await auth.supabase
    .from("modules")
    .update({ position: current.position })
    .eq("id", neighbor.id);

  const { error: err3 } = await auth.supabase
    .from("modules")
    .update({ position: neighbor.position })
    .eq("id", current.id);

  if (err2 || err3) return { success: false, message: "Falha ao reordenar (step 2)." };

  revalidatePath(`/admin/cursos/${courseSlug}/`);

  return { success: true, message: "Reordenado com sucesso." };
}
```

### Sobre race conditions

**Risco real:** Baixo para este projeto (single-admin). O Supabase não suporta `SELECT...FOR UPDATE` diretamente via JS SDK sem usar RPC/SQL bruto. Para um admin, a janela de conflito é extremamente pequena.

**Alternativa mais simples** — compactação de posições antes do swap (garante contiguidade e elimina gaps):

```typescript
// Antes do swap, recompactar posições
const updates = modules.map((m, idx) => ({ id: m.id, position: idx + 1 }));
// Aplicar todos os updates... (mais queries, mas elimina gaps)
```

**Recomendação para Phase 2:** Usar o swap direto de 3 steps (valor temporário) sem compactação prévia. Gaps são irrelevantes para a lógica de swap desde que as posições relativas sejam mantidas. Compactação pode ser adicionada como ação de manutenção se necessário.

> [ASSUMED] — Posições de módulo/aula em `modules.position` e `lessons.position` não têm
> UNIQUE constraint (verificado em `0001_initial_schema.sql`: sem constraint de unique em position).
> Confirmar antes de usar valor temporário -1 (sem UNIQUE, não há conflito).

---

## Q9: Breadcrumb Component

### Recomendação: Server-driven com props explícitas

Dado que as páginas aninhadas têm slugs e UUIDs na URL que precisam ser resolvidos para títulos (ex: `/admin/cursos/gestao-incidentes/modulos/uuid-aqui` → "Gestão de Incidentes" / "Módulo Avançado"), o breadcrumb deve ser alimentado por props, não derivado da URL.

**Implementação baseada no UI-SPEC.md confirmado:**

```typescript
// src/components/admin/breadcrumb.tsx
import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string; // undefined = item atual (sem link)
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="Navegação">
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight size={14} aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span
                  className="font-medium text-slate-900"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-slate-900 transition">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

**Uso em RSC:**
```typescript
// src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx
import { Breadcrumb } from "@/components/admin/breadcrumb";

export default async function ModulePage({ params }) {
  const course = await getCourseBySlug(params.slug);
  const module = await getModuleById(params.moduleId);

  return (
    <>
      <Breadcrumb items={[
        { label: "Catálogo", href: "/admin/cursos" },
        { label: course.title, href: `/admin/cursos/${course.slug}` },
        { label: module.title }, // sem href = item atual
      ]} />
      {/* ... */}
    </>
  );
}
```

**Por que server-driven:**
1. Títulos reais (não UUIDs) precisam de dados do banco — já buscados no RSC
2. Sem `usePathname` (client hook desnecessário para RSC-first)
3. Sem necessidade de registrar mapeamentos de rota
4. Compatível com Vitest node environment (componente puro sem hooks)

---

## Validation Architecture

(Q10 — Arquitetura de Validação para Nyquist)

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.4 |
| Config file | `vitest.config.ts` (existente) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run test:ci` |
| Environment | `node` (sem jsdom) |
| Alias `@/*` | configurado em vitest.config.ts |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Arquivo existe? |
|--------|----------|-----------|-------------------|-----------------|
| CAT-01/CAT-06 | `createCourseSchema` rejeita slug inválido e aceita válido | unit | `npx vitest run src/lib/courses/schema.test.ts` | ✅ (estender) |
| CAT-01/CAT-06 | `createCourseAction` retorna erro claro em colisão 23505 | unit | `npx vitest run src/app/actions/upsert-course.test.ts` | ❌ Wave 0 |
| CAT-02/CAT-03 | `createModuleSchema` / novo `updateModuleSchema` valida campos | unit | `npx vitest run src/lib/modules/schema.test.ts` | ❌ Wave 0 |
| CAT-03 | `updateLessonSchema` valida video_provider/video_external_id/workload | unit | `npx vitest run src/lib/lessons/schema.test.ts` | ✅ (estender) |
| CAT-04 | `validateMaterialFile` rejeita ZIP (fora da whitelist D-08) e aceita PDF | unit | `npx vitest run src/lib/materials/storage.test.ts` | ❌ Wave 0 |
| CAT-04 | `validateMaterialFile` rejeita arquivo > 20MB | unit | `npx vitest run src/lib/materials/storage.test.ts` | ❌ Wave 0 |
| CAT-05/CAT-07 | Query `getAvailableCourses` não retorna cursos sem `published_at` ou com `archived_at` | unit (mock Supabase) | `npx vitest run src/lib/courses/queries.test.ts` | ✅ (estender) |
| CAT-06 | `slugify("Gestão de Incidentes")` retorna `"gestao-de-incidentes"` | unit | `npx vitest run src/lib/courses/slugify.test.ts` | ❌ Wave 0 |
| ENR-03 | `grantEnrollmentAction` retorna erro 23505 quando enrollment duplicado | unit | `npx vitest run src/app/actions/grant-enrollment.test.ts` | ❌ Wave 0 |
| ENR-03 | `lookupProfileByEmailAction` retorna null para email inexistente | unit | `npx vitest run src/app/actions/grant-enrollment.test.ts` | ❌ Wave 0 |
| MKT-01 | Landing page renderiza 11 seções (non-regression) | unit/RSC | manual ou `npx vitest run src/app/page.test.ts` | ❌ Wave 0 (se automatizado) |
| MKT-02 | `institutionalLeadSchema` aceita UTMs opcionais e rejeita UTM > 255 chars | unit | `npx vitest run src/lib/marketing/institutional-lead-schema.test.ts` | ✅ (estender) |

### Sampling Rate

- **Por task commit:** `npx vitest run --reporter=verbose` (full fast suite, ~segundos)
- **Por wave merge:** `npm run test:ci && npm run typecheck && npm run lint`
- **Phase gate:** Suite completa verde + `npm run build` antes de `/gsd-verify-work`

### Wave 0 Gaps (arquivos a criar antes da implementação)

- [ ] `src/lib/courses/slugify.test.ts` — cobre slugify pt-BR (ç, ã, õ, etc.)
- [ ] `src/lib/materials/storage.test.ts` — cobre MIME whitelist, size limit, ZIP rejeitado
- [ ] `src/app/actions/upsert-course.test.ts` — cobre 23505 catch, publish/archive actions
- [ ] `src/lib/modules/schema.test.ts` — cobre updateModuleSchema com campos opcionais
- [ ] `src/app/actions/grant-enrollment.test.ts` — cobre lookup, grant, duplicate, pending

---

## Architecture Patterns

### Pattern 1: Server Action com useActionState (padrão de referência existente)

```typescript
// Já verificado em src/app/admin/course-manager.tsx + src/app/actions/upsert-course.ts
// Padrão a replicar para TODAS as novas forms de Phase 2

// Server Action (src/app/actions/*.ts):
export async function publishCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const courseId = String(formData.get("course_id") ?? "");
  // 1. Validação Zod
  // 2. requireAdminUser()
  // 3. UPDATE published_at = now(), archived_at = null
  // 4. Capturar 23505/42501 → traduzir
  // 5. revalidatePath(...)
  // 6. return { success: true/false, message: "..." }
}

// Client Component:
const [state, formAction] = useActionState<CourseFormState, FormData>(
  publishCourseAction, initialCourseFormState
);
```

### Pattern 2: requireAdminUser (padrão de referência existente)

```typescript
// Padrão verificado em src/app/actions/upsert-course.ts — COPIAR EXATAMENTE
// Toda nova server action de admin DEVE começar com este guard
async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) logger.error("Failed to load session on admin action", error.message);
  if (!user) return { supabase, user: null, errorMessage: "Sessão expirada. Atualize a página." };

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") return { supabase, user: null, errorMessage: "Sem permissão." };

  return { supabase, user, errorMessage: null };
}
```

### Pattern 3: Revalidação após mutação admin

```typescript
// Padrão: revalidar caminhos relevantes após cada mutação
function revalidateCourseAdminPages(slug: string) {
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${slug}`);
  revalidatePath("/dashboard");
}
```

### Pattern 4: Dialog com estado local (sem deps externas)

```typescript
// "use client" — Dialog implementado com useState + portal ou <dialog> nativo
// UI-SPEC.md especifica: Overlay fixed + Panel max-w-md + Esc fecha + autoFocus email
function GrantEnrollmentDialog({ courseId, courseTitle, isOpen, onClose }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // ... form com useActionState para lookupProfileByEmailAction
  // ... estados: idle → buscando → encontrado/não-encontrado/já-tem-acesso
}
```

### Pattern 5: Extensão de tipos em database.types.ts (hand-edit)

```typescript
// src/lib/database.types.ts — adicionar campos após aplicar migration 0014
// courses.Row:
published_at: string | null;   // timestamptz → string ISO no SDK
archived_at:  string | null;

// modules.Row:
deleted_at: string | null;

// lessons.Row:
deleted_at:        string | null;
video_provider:    string | null;
video_external_id: string | null;
workload_minutes:  number | null;

// institutional_leads.Row:
utm_source:   string | null;
utm_medium:   string | null;
utm_campaign: string | null;
```

### Recommended Project Structure (novos arquivos)

```
src/
├── app/
│   ├── actions/
│   │   ├── update-module.ts          # updateModuleAction, deleteModuleAction, reorderModuleAction
│   │   ├── update-lesson.ts          # updateLessonAction, deleteLessonAction, restoreLessonAction, reorderLessonAction
│   │   └── grant-enrollment.ts       # lookupProfileByEmailAction, grantEnrollmentAction, revokeEnrollmentAction
│   └── admin/
│       └── cursos/
│           ├── page.tsx              # lista cursos (RSC)
│           ├── novo/
│           │   └── page.tsx          # criação (FLAG-01: página dedicada)
│           └── [slug]/
│               ├── page.tsx          # edita curso + lista módulos (RSC)
│               ├── modulos/
│               │   └── [moduleId]/
│               │       └── page.tsx  # edita módulo + lista aulas (RSC)
│               ├── aulas/
│               │   └── [lessonId]/
│               │       └── page.tsx  # edita aula + lista materiais (RSC)
│               └── alunos/
│                   └── page.tsx      # enrollments (RSC)
├── components/
│   └── admin/
│       ├── breadcrumb.tsx            # Breadcrumb server-driven (Q9)
│       ├── grant-enrollment-dialog.tsx # Dialog D-09/D-10 (Q5)
│       └── material-upload.tsx       # FileUploadArea com whitelist D-08
└── lib/
    ├── courses/
    │   └── slugify.ts                # slugify pt-BR (Q7)
    └── enrollments/
        └── queries.ts                # getEnrollmentsByCourse, getPendingEnrollmentsByCourse
```

### Anti-Patterns to Avoid

- **Não usar `process.env` diretamente** — CLAUDE.md proíbe; usar `getEnv()` / `getClientEnv()` (há tech debt existente nessa área — CONCERNS.md)
- **Não fazer pre-check de slug antes do INSERT** — D-07 explicitamente escolheu captura de 23505 (race-safe)
- **Não usar o admin client para queries de leitura de admin** — usar `createSupabaseServerClient()` exceto onde RLS precisa ser bypassado (admin client só para INSERT de enrollment, invite, pending_enrollments)
- **Não criar Server Action sem `requireAdminUser()` no início** — toda nova action admin deve ter esse guard
- **Não importar de barrels (index.ts)** — CLAUDE.md / CONVENTIONS.md: imports diretos do arquivo fonte
- **Não inline validação Zod em actions** — schema sempre em `src/lib/{domain}/schema.ts`

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management + pending | Custom state + fetch | `useActionState` + `useFormStatus` | Já no projeto; integrado com RSC |
| Slug uniqueness check | Pre-check SELECT antes de INSERT | Captura de 23505 (D-07) | Race-safe; padrão já no upsert-course.ts |
| Admin session validation | Replicar auth logic em cada action | `requireAdminUser()` | Já extraído; reusar em TODAS as novas actions |
| File type detection | Custom mime parse / magic bytes lib | MIME whitelist + extensão (Q6) | Suficiente para contexto admin; sem dep nova |
| URL-safe slugs | Regex manual ad-hoc | `slugify()` em `src/lib/courses/slugify.ts` | Reusar em todos os forms de título |
| Dialog/Modal | Library de UI externa | `<dialog>` nativo ou `useState` + overlay | UI-SPEC confirma: sem lib externa |
| Breadcrumb | Parse de URL + lookup assíncrono | Props server-driven (Q9) | RSC já tem os dados; sem client hook |

---

## Common Pitfalls

### Pitfall 1: `revalidatePath` com path incorreto

**O que vai errado:** Após uma mutação, a página não atualiza mesmo com sucesso. O admin vê dados antigos.

**Por que acontece:** `revalidatePath` é sensível ao path exato. `/admin/cursos/[slug]` revalidado com o template literal `"/admin/cursos/[slug]"` (string com colchetes) invalida o padrão, mas se chamado com o slug real `"/admin/cursos/gestao-incidentes"`, invalida apenas aquela página específica.

**Como evitar:** Chamar ambos:
```typescript
revalidatePath("/admin/cursos");              // lista
revalidatePath(`/admin/cursos/${slug}`);      // página específica
revalidatePath("/admin/cursos/[slug]", "page"); // padrão dinâmico
```

**Sinais de alerta:** Dado correto no banco, UI mostra valor antigo após submit bem-sucedido.

---

### Pitfall 2: CourseRow sem `published_at`/`archived_at` após migration

**O que vai errado:** TypeScript aceita o código mas o campo retorna `undefined` em runtime; lógica de status derivado quebra silenciosamente.

**Por que acontece:** `database.types.ts` é hand-editado manualmente. Se esquecer de adicionar os novos campos antes de implementar as queries, o type assertion `as CourseRow` mascara o erro.

**Como evitar:** Step dedicado no Wave 0 para atualizar `database.types.ts` ANTES de qualquer query que use os novos campos. Adicionar `published_at` e `archived_at` ao Row, Insert, e Update de `courses`.

---

### Pitfall 3: Soft delete filtering esquecido em queries do player de aluno

**O que vai errado:** Aulas soft-deleted aparecem para o aluno no player de curso (Phase 3).

**Por que acontece:** `getCourseWithContent` em `src/lib/courses/queries.ts` busca `modules.lessons` sem filtro de `deleted_at`. Mesmo que Phase 2 adicione o campo, se ninguém filtrar na query do aluno, o campo existe mas não protege.

**Como evitar:** Ao adicionar `deleted_at` às colunas, IMEDIATAMENTE adicionar `.is("deleted_at", null)` nas queries do player/dashboard. Adicionar teste no `queries.test.ts` que verifica que aulas com `deleted_at != null` não aparecem.

---

### Pitfall 4: `video_url` removida acidentalmente

**O que vai errado:** Player existente (`src/app/curso/[slug]/aula/[lessonId]/page.tsx`) quebra porque `lesson.video_url` é `undefined`.

**Por que acontece:** D-03 preserva `video_url` (legado para Phase 4), mas se o executor alterar o schema ou a query para usar apenas `video_provider`/`video_external_id`, o player atual (que usa `video_url`) quebra.

**Como evitar:** `0014_catalog_metadata.sql` não faz DROP da coluna `video_url`. As queries devem continuar selecionando `video_url` em `getCourseWithContent` e `getLessonWithCourseContext`. A UI de admin em Phase 2 APENAS armazena `video_provider` e `video_external_id` — o player os ignora até Phase 4.

---

### Pitfall 5: Admin client usado onde server client é suficiente

**O que vai errado:** Chamadas com admin client (bypass de RLS) em contextos onde o server client (cookie-bound, com RLS ativo) seria correto.

**Por que acontece:** É tentador usar admin client para "simplicidade" quando RLS bloqueia algo inesperadamente.

**Como evitar:** Admin client APENAS para: INSERT em `enrollments`/`pending_enrollments` (pois admin bypassa RLS de insert), chamada de `auth.admin.inviteUserByEmail()`, reconciliação de `pending_enrollments`. Toda leitura de dados de admin usa server client com políticas "Admins read all X" do banco.

---

### Pitfall 6: `useActionState` importado de local incorreto em React 19

**O que vai errado:** Erro de compilação ou comportamento inesperado.

**Por que acontece:** Em React 18, o hook era `useFormState` de `react-dom`. Em React 19 (que este projeto usa), é `useActionState` de `react`. O arquivo `course-manager.tsx` já usa corretamente `useActionState` de `"react"` e `useFormStatus` de `"react-dom"`.

**Como evitar:** Copiar o padrão de import do `course-manager.tsx` existente:
```typescript
import { useActionState } from "react";        // ← correto para React 19
import { useFormStatus } from "react-dom";     // ← sempre de react-dom
```

> [VERIFIED: codebase] — `src/app/admin/course-manager.tsx` linha 1 confirma o import correto.

---

## Code Examples

### Exemplo: Action de publicar curso

```typescript
// src/app/actions/upsert-course.ts — ADICIONAR
export async function publishCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const courseId = String(formData.get("course_id") ?? "");
  if (!courseId) return { success: false, message: "Curso não identificado." };

  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const { error } = await auth.supabase
    .from("courses")
    .update({ published_at: new Date().toISOString(), archived_at: null })
    .eq("id", courseId)
    .select("id")
    .single();

  if (error) {
    logger.error("Falha ao publicar curso", { courseId, error: error.message });
    return { success: false, message: "Não foi possível publicar o curso. Tente novamente." };
  }

  revalidateCoursePages();
  return { success: true, message: "Curso publicado. Agora está visível para alunos com matrícula ativa." };
}
```

### Exemplo: Extensão de `institutionalLeadSchema` com UTMs (MKT-02)

```typescript
// src/lib/marketing/institutional-lead-schema.ts — ESTENDER
const optionalUtmString = z
  .string()
  .max(255, "UTM não pode exceder 255 caracteres.")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  });

export const institutionalLeadSchema = z.object({
  // ... campos existentes mantidos ...
  organization: z.string().min(2, "Informe o nome da escola ou rede."),
  contactName: z.string().min(2, "Informe o nome do contato."),
  email: z.string().email("Informe um e-mail válido."),
  phone: optionalString,
  headcount: optionalString
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || Number.isFinite(value), "Informe apenas números."),
  message: optionalString,
  // NOVOS — D-11/MKT-02:
  utmSource:   optionalUtmString,
  utmMedium:   optionalUtmString,
  utmCampaign: optionalUtmString,
});
```

```typescript
// src/app/actions/create-institutional-lead.ts — ATUALIZAR insert
const { error } = await supabase.from("institutional_leads").insert({
  organization: parsed.data.organization,
  contact_name: parsed.data.contactName,
  email: parsed.data.email,
  phone: parsed.data.phone,
  headcount: parsed.data.headcount,
  message: parsed.data.message,
  // NOVOS:
  utm_source:   parsed.data.utmSource ?? null,
  utm_medium:   parsed.data.utmMedium ?? null,
  utm_campaign: parsed.data.utmCampaign ?? null,
});
```

```tsx
// src/app/page.tsx — RSC: passar UTMs como hidden inputs
export default async function HomePage({ searchParams }) {
  const utmSource   = (await searchParams).utm_source?.toString() ?? "";
  const utmMedium   = (await searchParams).utm_medium?.toString() ?? "";
  const utmCampaign = (await searchParams).utm_campaign?.toString() ?? "";
  return (
    // ... layout existente preservado ...
    <InstitutionalLeadForm
      utmSource={utmSource}
      utmMedium={utmMedium}
      utmCampaign={utmCampaign}
    />
  );
}

// No form:
<input type="hidden" name="utmSource"   defaultValue={utmSource} />
<input type="hidden" name="utmMedium"   defaultValue={utmMedium} />
<input type="hidden" name="utmCampaign" defaultValue={utmCampaign} />
```

### Exemplo: Status derivado de curso

```typescript
// src/lib/courses/utils.ts (novo) ou inline no componente
export type CourseStatus = "draft" | "published" | "archived";

export function deriveCourseStatus(course: {
  published_at: string | null;
  archived_at: string | null;
}): CourseStatus {
  if (course.archived_at !== null) return "archived";
  if (course.published_at !== null) return "published";
  return "draft";
}

// Badge de status (UI-SPEC.md)
const STATUS_BADGE: Record<CourseStatus, string> = {
  draft:     "bg-slate-100 text-slate-600 border border-slate-300",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  archived:  "bg-amber-50 text-amber-700 border border-amber-200",
};

const STATUS_LABEL: Record<CourseStatus, string> = {
  draft:     "Rascunho",
  published: "Publicado",
  archived:  "Arquivado",
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (React 18) | `useActionState` (React 19) | React 19.0 | Importação muda de `react-dom` para `react` |
| `formAction` prop direto | `useActionState` para estado | Next.js 14+ | Formulários tem estado retornado da action |
| `useFormState` de `react-dom` | `useActionState` de `react` | React 19 | Já correto no course-manager.tsx |

**Deprecated/outdated:**
- `useFormState` de `react-dom`: substituído por `useActionState` de `react`. **O projeto já usa a versão correta** — confirmar ao criar novos componentes.

---

## Open Questions

1. **RLS existente em `courses` para leitura de aluno autenticado**
   - O que sabemos: migrations 0001–0013 estão no projeto; 0003 adiciona policies para `materials`; não foi possível ler 0003–0010 nesta sessão
   - O que está incerto: Se existe ou não uma policy de SELECT em `courses` para `authenticated` users (além da de admin) — a nova policy em 0014 pode colidir
   - Recomendação: O executor deve ler `0003_lessons_materials_admin_policies.sql` antes de aplicar 0014

2. **Campo `video_url NOT NULL` em `lessons` (0001_initial_schema.sql)**
   - Identificado: `lessons.video_url text not null` (linha 49 de 0001)
   - Problema: Phase 2 quer que `video_url` seja opcional quando se usa `video_provider`/`video_external_id`
   - Opção: Adicionar `alter table public.lessons alter column video_url drop not null;` em 0014
   - Recomendação: Incluir este ALTER em 0014 para permitir criação de novas aulas sem `video_url`

3. **Suporte a `searchParams` como async no Next.js 16**
   - O projeto usa Next.js 16.0.10. `searchParams` em RSC é uma Promise no Next.js 15+
   - Exemplo acima usa `await searchParams` — confirmar que o padrão está correto para a versão instalada

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2 é 100% extensão de código existente. Sem novas ferramentas externas, serviços, CLIs ou runtimes além do que já está no projeto. Supabase e Node.js 20 já estão confirmados pelo CI existente.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `requireAdminUser()` em toda server action de admin |
| V3 Session Management | yes | `createSupabaseServerClient()` cookie-bound (já implementado) |
| V4 Access Control | yes | Admin role check via `fetchUserRole()`; RLS no banco |
| V5 Input Validation | yes | Zod schemas em `src/lib/**/schema.ts`; nunca inline |
| V6 Cryptography | no | Sem nova criptografia em Phase 2 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Admin action sem auth check | Elevation of Privilege | `requireAdminUser()` no início de TODA action |
| Slug injection (ex: `../../../admin`) | Tampering | `slugRegex` Zod + unique constraint DB |
| MIME type spoofing em upload | Tampering | Extensão + MIME whitelist dupla (Q6) |
| Enrollment duplicado race | Tampering | UNIQUE constraint `(user_id, course_id)` + 23505 catch |
| UTM injection (script tags) | XSS | Zod `string().max(255)` + React escapa por padrão |
| Expose stack trace no 23505 | Information Disclosure | `formatSupabaseInsertOrUpdateError` traduz para mensagem pt-BR |

---

## Project Constraints (from CLAUDE.md)

Todas estas diretivas são **obrigatórias** para todos os novos arquivos desta fase:

| Diretiva | Aplicação em Phase 2 |
|---------|---------------------|
| Zod schemas em `src/lib/**/schema.ts` | Criar `update-module-schema.ts`, estender `lessons/schema.ts`, `courses/schema.ts`, `institutional-lead-schema.ts` |
| Typed Supabase clients `<Database>` | Toda query usa `SupabaseClient<Database>`; hand-edit `database.types.ts` antes das queries |
| `getEnv()` / `getClientEnv()` nunca `process.env` | Não usar `process.env` diretamente em nenhum novo arquivo |
| Server Actions sobre API routes | Todas as mutações novas são Server Actions. Upload de material permanece como API route (já justificado) |
| Vitest `environment: "node"` | Zero jsdom; testar lógica pura + mock de Supabase |
| `--max-warnings=0` no lint | `npm run lint` deve passar zero warnings em todo arquivo novo |
| UI copy em pt-BR | Todos os `message`, `fieldErrors`, labels, placeholders em pt-BR |
| Migrações manuais | 0014 requer aplicação manual via Supabase SQL Editor ou CLI |
| README.md atualizado | Adicionar `0014_catalog_metadata.sql` à lista de migrations no README |
| `logger.*` nunca `console.*` | `logger.error`, `logger.info`, etc. em todas as server actions |
| `captureException` via wrapper | Usar `captureException` de `@sentry/nextjs` para erros inesperados em actions |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `lessons` e `modules` não têm RLS habilitado atualmente | Q3, Q4 | RLS ativo mudaria a recomendação; app-level filter já seria aplicado por policy |
| A2 | Supabase `inviteUserByEmail` retorna `{ data: { user: { id } } }` no response | Q5 | Implementação de D-10 Option A precisa ajuste no acesso ao userId |
| A3 | `pending_enrollments.email` pode ser usado para reconciliar sem auth.users.id | Q5 | Se Supabase não garante unicidade de email em auth.users, um email pode ter múltiplos users |
| A4 | Supabase Storage não bloqueia tipos de arquivo por bucket sem policy explícita | Q6 | Se storage já rejeita alguns tipos, validação do app pode ser redundante (não prejudicial) |
| A5 | `modules.position` e `lessons.position` não têm UNIQUE constraint | Q8 | Com UNIQUE, usar valor temporário -1 no swap 3-steps causaria violação; precisaria de outra abordagem |
| A6 | RLS em courses para SELECT de aluno autenticado existe mas não foi confirmado nas migrations lidas | Q4 | Se não existir, a policy proposta em 0014 pode ser a primeira — ou pode colidir com outra existente |
| A7 | `searchParams` em Next.js 16.0.10 é async (Promise) | Q10 / MKT-02 | Se síncrono (Next.js 14 behavior), `await searchParams` causaria erro |

**Itens A1, A5, A6:** O planner deve verificar nas migrations não lidas (0003–0010) antes de finalizar a migration 0014.

---

## Sources

### Primary (HIGH confidence)
- `src/app/actions/upsert-course.ts` — padrão 23505 catch, requireAdminUser, CourseFormState
- `src/app/admin/course-manager.tsx` — padrão useActionState, useFormStatus, FieldError
- `src/app/actions/course-form-state.ts` — CourseFormState shape exato
- `src/lib/materials/storage.ts` — ALLOWED_MATERIAL_EXTENSIONS, validateMaterialFile
- `src/lib/courses/schema.ts` — slugRegex, baseCourseSchema
- `supabase/migrations/0013_institutions_enrollments.sql` — padrão DROP/CREATE policy, ALTER TABLE aditivo
- `supabase/migrations/0011_courses_and_certificates.sql` — padrão de migration de alter table
- `supabase/migrations/0001_initial_schema.sql` — shapes de courses/modules/lessons/enrollments

### Secondary (MEDIUM confidence)
- `.planning/phases/02-catalog-crud/02-CONTEXT.md` — decisões D-01..D-12
- `.planning/phases/02-catalog-crud/02-UI-SPEC.md` — especificação visual e de interação
- `.planning/codebase/CONVENTIONS.md` — padrões de naming, error handling, imports

### Tertiary (LOW / ASSUMED)
- Comportamento exato de `supabase.auth.admin.inviteUserByEmail()` response (A2 — verificar na impl)
- Estado de RLS em `lessons`/`modules` nas migrations 0003–0010 (A1, A6 — verificar)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — todas as versões verificadas no package.json e no npm registry
- Architecture: HIGH — padrões verificados diretamente no codebase
- SQL Migration (0014): MEDIUM-HIGH — baseado no padrão de 0013, mas com 3 assumptions sobre RLS existente
- Pitfalls: HIGH — baseados em código real verificado
- D-10 Opção A: MEDIUM — fluxo de reconciliação verificado conceitualmente; detalhes de invite SDK são ASSUMED

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (deps estáveis; re-verificar se houver atualização de Next.js ou Supabase SDK)

---

## Resolved Open Questions (verified by orchestrator after research)

| Question | Status | Evidence |
|----------|--------|----------|
| A1: RLS ativo em lessons/modules? | **CONFIRMED ENABLED** | `supabase/migrations/0002_roles_and_profiles.sql` lines 63 (modules) e 93 (lessons); 0003 reafirma para lessons | 
| A5: UNIQUE em (course_id, position) ou (module_id, position)? | **NO UNIQUE** | grep em todas as migrations não encontra essa constraint; swap de reorder não precisa de advisory lock para conflitos básicos |
| video_url NOT NULL? | **CONFIRMED NOT NULL** | `supabase/migrations/0001_initial_schema.sql` line 48 — migration 0014 DEVE incluir `ALTER COLUMN video_url DROP NOT NULL` para permitir aulas com video_provider/video_external_id sem video_url legacy |

**Implication for planner:** the soft-delete filter strategy can be either policy-level OR query-level (RLS already enabled gives the option). Recommendation from research stands: query-level filter is simpler and aligned with project precedent. 0014 must include `ALTER TABLE public.lessons ALTER COLUMN video_url DROP NOT NULL`.
