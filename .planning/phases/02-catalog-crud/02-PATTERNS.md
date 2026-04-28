# Phase 2: Catalog CRUD - Pattern Map

**Mapped:** 2026-04-28
**Files analyzed:** 30 (15 modify + 15 create, excluindo testes)
**Analogs found:** 27 / 30

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/0014_catalog_metadata.sql` | migration | batch | `supabase/migrations/0013_institutions_enrollments.sql` | exact |
| `src/lib/courses/schema.ts` (extend) | model/validation | transform | `src/lib/courses/schema.ts` (self) | self-extend |
| `src/lib/courses/types.ts` (extend) | model | — | `src/lib/courses/types.ts` (self) | self-extend |
| `src/lib/courses/queries.ts` (extend) | service | CRUD | `src/lib/courses/queries.ts` (self) | self-extend |
| `src/lib/courses/slugify.ts` (new) | utility | transform | `src/lib/materials/storage.ts` (sanitizeFileName) | role-match |
| `src/lib/courses/slugify.test.ts` (new) | test | — | `src/app/actions/create-lesson.test.ts` | exact |
| `src/lib/modules/schema.ts` (extend) | model/validation | transform | `src/lib/modules/schema.ts` (self) | self-extend |
| `src/lib/lessons/schema.ts` (extend) | model/validation | transform | `src/lib/lessons/schema.ts` (self) | self-extend |
| `src/lib/materials/storage.ts` (extend) | utility | file-I/O | `src/lib/materials/storage.ts` (self) | self-extend |
| `src/lib/marketing/institutional-lead-schema.ts` (extend) | model/validation | transform | `src/lib/marketing/institutional-lead-schema.ts` (self) | self-extend |
| `src/lib/database.types.ts` (hand-edit) | model | — | (manual edit — no analog) | — |
| `src/app/actions/upsert-course.ts` (extend) | service/action | request-response | `src/app/actions/upsert-course.ts` (self) | self-extend |
| `src/app/actions/update-module.ts` (new) | service/action | request-response | `src/app/actions/create-module.ts` | exact |
| `src/app/actions/update-lesson.ts` (new) | service/action | request-response | `src/app/actions/create-lesson.ts` | exact |
| `src/app/actions/grant-enrollment.ts` (new) | service/action | request-response | `src/app/actions/create-institutional-lead.ts` | role-match |
| `src/app/actions/manage-pending-enrollment.ts` (new) | service/action | event-driven | `src/app/actions/create-institutional-lead.ts` | role-match |
| `src/app/actions/create-institutional-lead.ts` (extend) | service/action | request-response | `src/app/actions/create-institutional-lead.ts` (self) | self-extend |
| `src/app/admin/page.tsx` (modify) | route/page | request-response | `src/app/admin/page.tsx` (self) | self-modify |
| `src/app/admin/course-manager.tsx` (refactor) | component | request-response | `src/app/admin/course-manager.tsx` (self) | self-refactor |
| `src/app/admin/cursos/page.tsx` (new) | route/page RSC | CRUD | `src/app/admin/page.tsx` | exact |
| `src/app/admin/cursos/novo/page.tsx` (new) | route/page RSC | request-response | `src/app/admin/page.tsx` | exact |
| `src/app/admin/cursos/[slug]/page.tsx` (new) | route/page RSC | CRUD | `src/app/admin/page.tsx` | exact |
| `src/app/admin/cursos/[slug]/modulos/[moduleId]/page.tsx` (new) | route/page RSC | CRUD | `src/app/admin/page.tsx` | exact |
| `src/app/admin/cursos/[slug]/aulas/[lessonId]/page.tsx` (new) | route/page RSC | CRUD | `src/app/admin/page.tsx` | exact |
| `src/app/admin/cursos/[slug]/alunos/page.tsx` (new) | route/page RSC | CRUD | `src/app/admin/page.tsx` | exact |
| `src/components/admin/breadcrumb.tsx` (new) | component | request-response | (no analog — new pattern) | none |
| `src/components/admin/grant-enrollment-dialog.tsx` (new) | component | request-response | `src/app/admin/usuarios/user-manager.tsx` | role-match |
| `src/components/admin/material-upload.tsx` (new) | component | file-I/O | `src/app/admin/course-manager.tsx` | role-match |
| `src/components/admin/reorder-buttons.tsx` (new) | component | event-driven | (no analog — new pattern) | none |
| `src/components/admin/status-badge.tsx` (new) | component | transform | (no analog) | none |
| `src/components/admin/confirmation-dialog.tsx` (new) | component | event-driven | (no analog) | none |
| All test files | test | — | `src/app/actions/create-lesson.test.ts` | exact |

---

## Pattern Assignments

### `supabase/migrations/0014_catalog_metadata.sql` (migration, batch)

**Analog:** `supabase/migrations/0013_institutions_enrollments.sql`

**Header comment pattern** (lines 1-13):
```sql
-- 0014_catalog_metadata.sql
-- Aplicar APOS 0013 ser aplicada.
-- Adiciona: published_at/archived_at em courses, deleted_at em modules e lessons,
--           video_provider/video_external_id/workload_minutes em lessons,
--           utm_source/utm_medium/utm_campaign em institutional_leads,
--           tabela pending_enrollments,
--           indices de performance, atualiza policy RLS de courses para alunos.
```

**Additive ALTER pattern** (analog lines 91-95):
```sql
alter table public.enrollments
  add column if not exists source public.enrollment_source not null default 'admin_grant',
  add column if not exists granted_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz null,
  add column if not exists institution_id uuid null references public.institutions(id) on delete restrict;
```
Apply same pattern for:
```sql
alter table public.courses
  add column if not exists published_at timestamptz null,
  add column if not exists archived_at timestamptz null;

alter table public.modules
  add column if not exists deleted_at timestamptz null;

alter table public.lessons
  add column if not exists deleted_at timestamptz null,
  add column if not exists video_provider text null,
  add column if not exists video_external_id text null,
  add column if not exists workload_minutes integer null;
-- video_url NOT NULL must become nullable:
alter table public.lessons
  alter column video_url drop not null;

alter table public.institutional_leads
  add column if not exists utm_source text null,
  add column if not exists utm_medium text null,
  add column if not exists utm_campaign text null;
```

**Index pattern** (analog lines 69, 83, 97):
```sql
create index if not exists idx_institutions_slug on public.institutions (slug);
create index if not exists idx_institution_members_institution_id on public.institution_members (institution_id);
create index if not exists idx_enrollments_institution_id on public.enrollments (institution_id);
```
Apply same pattern:
```sql
create index if not exists idx_courses_published_at on public.courses (published_at);
create index if not exists idx_lessons_deleted_at on public.lessons (deleted_at);
```

**RLS drop-then-create policy pattern** (analog lines 114-123):
```sql
drop policy if exists "Students read own enrollments" on public.enrollments;
create policy "Students read own enrollments"
  on public.enrollments
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and (expires_at is null or expires_at > now())
  );
```
Apply for courses student policy update (add `archived_at is null AND published_at is not null`).

**Service role bypass pattern** (analog lines 176-182):
```sql
drop policy if exists "Service role manages enrollments" on public.enrollments;
create policy "Service role manages enrollments"
  on public.enrollments
  for all
  to service_role
  using (true)
  with check (true);
```

**pending_enrollments new table** — modeled on `institution_members` pattern (analog lines 74-86):
```sql
create table if not exists public.pending_enrollments (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  expires_at_after_accept timestamptz null,
  created_at timestamptz not null default now(),
  unique (email, course_id)
);
create index if not exists idx_pending_enrollments_email on public.pending_enrollments (email);
```

---

### `src/lib/courses/schema.ts` (model/validation, extend)

**Analog:** `src/lib/courses/schema.ts` (self)

**Existing base pattern** (lines 69-96 of self):
```typescript
const baseCourseSchema = z.object({
  slug: z.string({ required_error: "Slug e obrigatorio." })
    .trim().min(1, ...).regex(slugRegex, ...),
  title: z.string({ required_error: "Titulo e obrigatorio." }).trim().min(1, ...),
  description: optionalTextSchema.transform((value) => value ?? null),
  // ...
});
export const createCourseSchema = baseCourseSchema.superRefine(...);
export const updateCourseSchema = baseCourseSchema.extend({ courseId: z.string().uuid() }).superRefine(...);
```

**Extend pattern for lifecycle actions:**
```typescript
// New schemas to add at bottom of file — same file, new exports
export const publishCourseSchema = z.object({
  courseId: z.string({ required_error: "Curso é obrigatório." }).uuid({ message: "Curso inválido." }),
});
export const archiveCourseSchema = publishCourseSchema; // same shape
export const unpublishCourseSchema = publishCourseSchema;

export type PublishCourseInput = z.infer<typeof publishCourseSchema>;
```

**Extend pattern for soft-delete reorder in modules/lessons schemas:**
```typescript
// Same preprocess + z.object pattern as createModuleSchema
export const updateModuleSchema = z.object({
  moduleId: z.string().uuid({ message: "Módulo inválido." }),
  title: z.string().trim().min(1, { message: "Nome do módulo é obrigatório." }),
  description: z.string().trim().optional().transform((v) => v?.length ? v : null),
});
export const deleteModuleSchema = z.object({
  moduleId: z.string().uuid(),
});
export const reorderModuleSchema = z.object({
  moduleId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});
```

---

### `src/lib/courses/slugify.ts` (utility, transform) — NEW

**Analog:** `src/lib/materials/storage.ts` (`sanitizeFileName`, lines 22-29)

**sanitizeFileName as structural reference** (storage.ts lines 22-29):
```typescript
export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}
```

**slugify.ts pattern to implement** (extends the same NFKD normalize approach for pt-BR):
```typescript
// src/lib/courses/slugify.ts
export function slugify(text: string): string {
  return text
    .normalize("NFKD")                      // decompose accents (pt-BR: ã → a + combining)
    .replace(/[̀-ͯ]/g, "")        // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")          // keep only alphanumeric, space, hyphen
    .replace(/\s+/g, "-")                   // spaces to hyphens
    .replace(/-+/g, "-")                    // collapse multiple hyphens
    .replace(/^-|-$/g, "");                 // strip leading/trailing hyphens
}
```
File is ~20 lines. No imports needed. Export named `slugify`.

---

### `src/lib/courses/queries.ts` (service, CRUD extend)

**Analog:** `src/lib/courses/queries.ts` (self)

**Existing filter chain pattern** (lines 91-117):
```typescript
const { data, error } = await supabase
  .from("courses")
  .select(`id, slug, title, ... modules (id, lessons (id))`)
  .order("created_at", { ascending: true });
```

**Student visibility filter to add:**
```typescript
// In getAvailableCourses — student path
.not("published_at", "is", null)
.is("archived_at", null)
```

**Soft-delete filter for lesson/module queries** (RESEARCH Q3 recommendation):
```typescript
// In getCourseWithContent for student player — add to inner lesson select
.is("deleted_at", null)  // for .from("lessons") queries

// Admin path: no .is("deleted_at", null) filter — admin sees all
```

**Pattern for new admin-specific query** (mirrors resolveClient pattern lines 47-53):
```typescript
export async function getAdminCourseList(client?: SupabaseServerClient): Promise<CourseRow[]> {
  const supabase = await resolveClient(client);
  // No published_at/archived_at filter — admin sees all statuses
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, description, cover_image_url, published_at, archived_at, created_at, updated_at")
    .order("created_at", { ascending: true });
  if (error) {
    logger.error("Falha ao carregar cursos para admin", error.message);
    return [];
  }
  return (data as CourseRow[]) ?? [];
}
```

---

### `src/app/actions/upsert-course.ts` (service/action, extend)

**Analog:** `src/app/actions/upsert-course.ts` (self, lines 1-173)

**requireAdminUser pattern** (lines 11-32) — copy verbatim to all new server actions:
```typescript
async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    logger.error("Failed to load authenticated session on course admin action", error.message);
  }
  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessao expirada. Atualize a pagina e tente novamente." };
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Voce nao tem permissao para gerenciar cursos." };
  }
  return { supabase, user, errorMessage: null as string | null };
}
```

**New lifecycle actions to add (same file):**
```typescript
export async function publishCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const parsed = publishCourseSchema.safeParse({ courseId: formData.get("course_id") });
  if (!parsed.success) { return { success: false, message: "Curso inválido." }; }

  const auth = await requireAdminUser();
  if (auth.errorMessage) { return { success: false, message: auth.errorMessage }; }

  const { error } = await auth.supabase
    .from("courses")
    .update({ published_at: new Date().toISOString(), archived_at: null })
    .eq("id", parsed.data.courseId);

  if (error) {
    logger.error("Falha ao publicar curso", { error: error.message });
    return { success: false, message: "Não foi possível publicar o curso." };
  }
  revalidateCoursePages();
  return { success: true, message: "Curso publicado. Agora está visível para alunos com matrícula ativa." };
}
// archiveCourseAction: sets archived_at = now()
// unpublishCourseAction: sets published_at = null
```

**23505 catch pattern** (lines 60-73):
```typescript
function formatSupabaseInsertOrUpdateError(error: { code?: string | null; message?: string | null }) {
  const permissionDenied = error.code === "42501" || (error.message ?? "").toLowerCase().includes("permission denied");
  const uniqueViolation = error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");
  if (permissionDenied) { return "Voce nao tem permissao para salvar cursos (RLS)."; }
  if (uniqueViolation) { return "Já existe um curso com esse slug. Escolha outro."; }
  return "Nao foi possivel salvar o curso. Tente novamente.";
}
```

---

### `src/app/actions/update-module.ts` (service/action, request-response) — NEW

**Analog:** `src/app/actions/create-module.ts` (lines 1-143)

**Imports pattern** (create-module.ts lines 1-8):
```typescript
"use server";
import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
// Import new schemas: updateModuleSchema, deleteModuleSchema, reorderModuleSchema
import { updateModuleSchema, deleteModuleSchema, reorderModuleSchema } from "@/lib/modules/schema";
```

**FormState type** (create-module.ts lines 9-14):
```typescript
export type ModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
```

**Soft-delete pattern for deleteModuleAction:**
```typescript
// Soft delete — set deleted_at, DO NOT hard-delete
const { error } = await supabase
  .from("modules")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", parsed.data.moduleId);
```

**Position swap pattern for reorderModuleAction:**
```typescript
// Read current position and neighbor, then swap
const { data: current } = await supabase.from("modules").select("position, course_id").eq("id", moduleId).single();
const { data: neighbor } = await supabase.from("modules")
  .select("id, position")
  .eq("course_id", current.course_id)
  .eq("position", direction === "up" ? current.position - 1 : current.position + 1)
  .is("deleted_at", null)
  .maybeSingle();
// Swap positions in two UPDATE calls inside try/catch
```

**Permission guard pattern** (create-module.ts lines 41-64 — inline style, not requireAdminUser):
```typescript
const supabase = await createSupabaseServerClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError) { logger.error("...", userError.message); }
if (!user) { return { success: false, message: "Sessão expirada. Atualize a página e tente novamente." }; }
const role = await fetchUserRole(supabase, user.id);
if (role !== "admin") { return { success: false, message: "Você não tem permissão para criar módulos." }; }
```
Note: `upsert-course.ts` uses the extracted `requireAdminUser()` helper. Either style is acceptable — prefer the extracted helper for new files for brevity.

---

### `src/app/actions/update-lesson.ts` (service/action, request-response) — NEW

**Analog:** `src/app/actions/create-lesson.ts` (lines 1-279)

**Imports pattern** (create-lesson.ts lines 1-9):
```typescript
"use server";
import { revalidatePath } from "next/cache";
import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Phase 2 adds: updateLessonSchema, deleteLessonSchema, reorderLessonSchema, restoreLessonSchema
```

**Soft-delete pattern** (same as module):
```typescript
export async function deleteLessonAction(
  _prevState: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  // ... requireAdminUser ...
  const { error } = await supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", lessonId);
  if (error) { /* logger + return error */ }
  revalidatePath(`/admin/cursos/${courseSlug}/modulos/${moduleId}`);
  return { success: true, message: "Aula arquivada. Histórico de progresso preservado." };
}
```

**Restore pattern** (inverse soft-delete):
```typescript
export async function restoreLessonAction(...): Promise<LessonFormState> {
  // ... requireAdminUser ...
  const { error } = await supabase
    .from("lessons")
    .update({ deleted_at: null })
    .eq("id", lessonId);
  // ...
  return { success: true, message: "Aula restaurada com sucesso." };
}
```

**Error handling pattern for DB errors** (create-lesson.ts lines 139-153):
```typescript
if (insertError) {
  logger.error("Falha ao criar aula", insertError);
  const permissionDenied =
    insertError.code === "42501" || (insertError.message ?? "").toLowerCase().includes("permission denied");
  const networkFailure = (insertError.message ?? "").toLowerCase().includes("fetch failed");
  return {
    success: false,
    message: permissionDenied ? "..." : networkFailure ? "..." : "Não foi possível salvar a aula. Tente novamente.",
  };
}
```

---

### `src/app/actions/grant-enrollment.ts` (service/action, request-response) — NEW

**Analog:** `src/app/actions/create-institutional-lead.ts` (lines 1-95)

**Imports pattern with admin client** (create-institutional-lead.ts lines 1-7):
```typescript
"use server";
import { captureException } from "@sentry/nextjs";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
// Also needs:
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchUserRole } from "@/lib/auth/roles";
```

**FormState type** (create-institutional-lead.ts lines 9-18):
```typescript
export type EnrollmentFormState = {
  success: boolean;
  message: string;
  foundProfile?: { id: string; fullName: string; email: string } | null;
  fieldErrors?: Record<string, string[] | undefined>;
};
export const initialEnrollmentState: EnrollmentFormState = { success: false, message: "" };
```

**Admin client usage pattern** (create-institutional-lead.ts lines 44-63):
```typescript
// Uses createSupabaseAdminClient() to bypass RLS for INSERT
const supabase = createSupabaseAdminClient();
const { error } = await supabase.from("institutional_leads").insert({ ... });
if (error) {
  logger.error("Falha ao registrar lead institucional", error.message);
  captureException(new Error("Supabase insert error (institutional_leads)"), {
    extra: { message: error.message, code: error.code },
  });
  return { success: false, message: "Não foi possível enviar suas informações. Tente novamente." };
}
```

**lookupProfileByEmailAction (needs server client for the SELECT):**
```typescript
export async function lookupProfileByEmailAction(
  _prevState: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  // requireAdminUser first (uses server client)
  // then query profiles by email using admin client (bypasses RLS)
  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .eq("email", formData.get("email") as string)
    .maybeSingle();
  // Return foundProfile in state shape
}
```

**23505 for enrollment UNIQUE (user_id, course_id):**
```typescript
if (error.code === "23505") {
  return { success: false, message: "Este aluno já tem acesso ativo a este curso." };
}
```

---

### `src/app/actions/manage-pending-enrollment.ts` (service/action, event-driven) — NEW

**Analog:** `src/app/actions/create-institutional-lead.ts` (admin client pattern)

**Pattern:** Called from `accept-invite-form.tsx` after user confirms account. Converts `pending_enrollments` row to real `enrollments` row.

```typescript
"use server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function convertPendingEnrollmentsForEmail(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data: pending } = await supabase
    .from("pending_enrollments")
    .select("id, course_id, expires_at_after_accept")
    .eq("email", email);

  if (!pending || pending.length === 0) return;

  // Look up the new profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    logger.error("Perfil não encontrado ao converter pending_enrollments", { email });
    return;
  }

  for (const row of pending) {
    const { error } = await supabase.from("enrollments").insert({
      user_id: profile.id,
      course_id: row.course_id,
      source: "admin_grant",
      granted_at: new Date().toISOString(),
      expires_at: row.expires_at_after_accept,
    });
    if (error && error.code !== "23505") { // ignore already-enrolled
      logger.error("Falha ao converter pending_enrollment", { email, error: error.message });
    } else {
      await supabase.from("pending_enrollments").delete().eq("id", row.id);
    }
  }
}
```

---

### `src/app/actions/create-institutional-lead.ts` (extend)

**Analog:** self

**Extension pattern — add UTM fields to rawInput and insert:**
```typescript
// Add to rawInput:
const rawInput = {
  organization: formData.get("organization"),
  // ... existing fields ...
  utmSource: formData.get("utm_source"),
  utmMedium: formData.get("utm_medium"),
  utmCampaign: formData.get("utm_campaign"),
};

// Add to insert:
await supabase.from("institutional_leads").insert({
  // ... existing fields ...
  utm_source: parsed.data.utmSource ?? null,
  utm_medium: parsed.data.utmMedium ?? null,
  utm_campaign: parsed.data.utmCampaign ?? null,
});
```

---

### Admin RSC Pages (`/admin/cursos/*`) (route/page RSC, CRUD)

**Analog:** `src/app/admin/page.tsx` (lines 1-90)

**Imports pattern** (admin/page.tsx lines 1-9):
```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
```

**Auth + role guard pattern** (admin/page.tsx lines 15-35):
```typescript
export default async function AdminCursosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) { console.error("Failed to load authenticated session", error.message); }
  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin/cursos" });
    redirect(`/login?${search.toString()}`);
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") { redirect("/dashboard"); }
  // ... fetch data and render ...
}
```
Note: Replace `console.error` with `logger.error` (CLAUDE.md convention — `admin/page.tsx` is legacy; new pages use logger).

**Header layout pattern** (admin/page.tsx lines 49-67):
```tsx
<div className="flex min-h-screen flex-col bg-slate-50">
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <span className="text-base font-semibold text-slate-900">Gestao de Incidentes</span>
      <LogoutButton />
    </div>
  </header>
  <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
    {/* page content */}
  </main>
</div>
```

**Eyebrow + h1 pattern** (admin/page.tsx lines 71-73):
```tsx
<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CATÁLOGO</p>
<h1 className="mt-2 text-2xl font-semibold text-slate-900">Catálogo de cursos</h1>
```

**Dynamic segment pages** — use `params` prop:
```typescript
// For /admin/cursos/[slug]/page.tsx
export default async function CourseEditPage({ params }: { params: { slug: string } }) {
  const { slug } = await params; // Next.js 16 — params is a Promise in some contexts; use await
  // ...
}
```

---

### `src/app/admin/page.tsx` (modify — redirect)

**Decision from UI-SPEC FLAG-02, Option A:** Replace body with:
```typescript
import { redirect } from "next/navigation";
export default function AdminPage() {
  redirect("/admin/cursos");
}
```
Keep `export const metadata` if desired. Remove `CourseManager` import.

---

### `src/components/admin/grant-enrollment-dialog.tsx` (component, request-response) — NEW

**Analog:** `src/app/admin/usuarios/user-manager.tsx` (lines 1-80)

**"use client" + useState pattern** (user-manager.tsx lines 1-12):
```typescript
"use client";
import { useState } from "react";
// Phase 2 uses useActionState instead of manual state for the Server Action calls
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
```

**Dialog open/close state pattern** (new — no direct analog, use useState):
```typescript
const [open, setOpen] = useState(false);
const triggerRef = useRef<HTMLButtonElement>(null);

// Close and restore focus
function handleClose() {
  setOpen(false);
  triggerRef.current?.focus();
}

// Escape key close
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) handleClose();
  }
  document.addEventListener("keydown", onKeyDown);
  return () => document.removeEventListener("keydown", onKeyDown);
}, [open]);
```

**Error message display pattern** (user-manager.tsx lines 55-78):
```tsx
{errorMessage && (
  <div role="status" aria-live="polite"
    className="rounded-lg px-3 py-2 text-sm border border-red-200 bg-red-50 text-red-700">
    {errorMessage}
  </div>
)}
{successMessage && (
  <div role="status" aria-live="polite"
    className="rounded-lg px-3 py-2 text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
    {successMessage}
  </div>
)}
```

**Dialog overlay + panel pattern** (from UI-SPEC):
```tsx
{open && (
  <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
       onClick={handleClose}>
    <div className="relative bg-white rounded-2xl shadow-lg w-full max-w-md p-6 space-y-4"
         role="dialog" aria-modal="true" aria-labelledby="grant-dialog-title"
         onClick={(e) => e.stopPropagation()}>
      <h3 id="grant-dialog-title" className="text-lg font-semibold text-slate-900">
        Conceder acesso ao curso
      </h3>
      {/* form content */}
    </div>
  </div>
)}
```

---

### `src/components/admin/material-upload.tsx` (component, file-I/O) — NEW

**Analog:** `src/app/admin/course-manager.tsx` (file input pattern, lines 63-88)

**Input field pattern** (course-manager.tsx lines 65-76):
```tsx
<label className="flex flex-col gap-2">
  <span className="text-sm font-medium text-slate-700">Campo *</span>
  <input
    type="text"
    name="field_name"
    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
  />
  <FieldError errors={state.fieldErrors?.fieldName} />
</label>
```

**Client-side MIME validation pattern** (to implement — before calling upload API):
```typescript
"use client";
import { ALLOWED_MATERIAL_MIME_TYPES } from "@/lib/materials/storage"; // new constant

function validateFileClient(file: File): string | null {
  if (file.size > 20 * 1024 * 1024) {
    return "O arquivo excede o limite de 20 MB. Escolha um arquivo menor.";
  }
  if (!ALLOWED_MATERIAL_MIME_TYPES.has(file.type)) {
    return "Tipo de arquivo não suportado. Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG.";
  }
  return null;
}
```

**FileUploadArea visual pattern** (from UI-SPEC Component 15):
```tsx
<div
  className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-sky-400 transition cursor-pointer"
  onClick={() => inputRef.current?.click()}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
  role="button" tabIndex={0}
  aria-describedby="upload-hint"
>
  <Upload size={24} className="mx-auto text-slate-400 mb-2" />
  <p className="text-sm font-medium text-slate-700">Clique para selecionar ou arraste um arquivo</p>
  <p id="upload-hint" className="text-xs text-slate-500 mt-1">
    Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG · Máx. 20 MB
  </p>
</div>
<input ref={inputRef} type="file"
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
  className="sr-only" onChange={handleFileChange} />
```

---

### `src/lib/materials/storage.ts` (utility, extend)

**Analog:** self

**ALLOWED_MATERIAL_MIME_TYPES constant to add** (after existing ALLOWED_MATERIAL_EXTENSIONS, line 17):
```typescript
export const ALLOWED_MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]);
```

**assertUploadable helper to add** (extends validateMaterialFile):
```typescript
export function assertUploadable(file: File): MaterialUploadValidationResult {
  const sizeAndExtResult = validateMaterialFile(file);
  if (!sizeAndExtResult.ok) return sizeAndExtResult;

  if (file.type && !ALLOWED_MATERIAL_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      message: "Tipo de arquivo não suportado. Tipos aceitos: PDF, Word, Excel, PowerPoint, PNG, JPEG.",
    };
  }
  return sizeAndExtResult;
}
```

---

### `src/lib/marketing/institutional-lead-schema.ts` (extend)

**Analog:** self (lines 1-23)

**Extension pattern:**
```typescript
// Add after existing fields in institutionalLeadSchema.object({...})
utmSource: z.string().max(255).optional().transform((v) => v?.trim() || null),
utmMedium: z.string().max(255).optional().transform((v) => v?.trim() || null),
utmCampaign: z.string().max(255).optional().transform((v) => v?.trim() || null),
```
Use same `optionalString` helper already in the file (lines 3-9) — no new helper needed.

---

### Status/UI Components (`status-badge.tsx`, `reorder-buttons.tsx`, `confirmation-dialog.tsx`, `breadcrumb.tsx`) — NEW

**Analog:** No direct analog in codebase. Implement from UI-SPEC specs.

**status-badge.tsx** — pure presentational, no "use client" needed:
```tsx
// src/components/admin/status-badge.tsx
type CourseStatus = "rascunho" | "publicado" | "arquivado";

const statusClasses: Record<CourseStatus, string> = {
  rascunho: "bg-slate-100 text-slate-600 border border-slate-300",
  publicado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  arquivado: "bg-amber-50 text-amber-700 border border-amber-200",
};
const statusLabels: Record<CourseStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function deriveCourseStatus(publishedAt: string | null, archivedAt: string | null): CourseStatus {
  if (archivedAt) return "arquivado";
  if (publishedAt) return "publicado";
  return "rascunho";
}
```

**reorder-buttons.tsx** — "use client" for form submission; uses useFormStatus per button:
```tsx
"use client";
// Each button is a separate <form> pointing at its server action
// Disabled state: isFirst prop → up disabled; isLast prop → down disabled
// Uses icon-button classes from UI-SPEC:
//   "inline-flex items-center justify-center rounded min-h-[44px] min-w-[44px] text-slate-500 ..."
```

**breadcrumb.tsx** — Server Component, no "use client":
```tsx
// src/components/admin/breadcrumb.tsx
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navegação">
      <ol className="flex items-center gap-1.5 text-sm text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
              {isLast || !item.href ? (
                <span className="font-medium text-slate-900" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-slate-900 transition">{item.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
```

**confirmation-dialog.tsx** — "use client", uses useState for open/close, same overlay pattern as grant-enrollment-dialog:
```tsx
"use client";
// role="alertdialog" (not "dialog") per UI-SPEC accessibility notes
// Foco inicial vai para o botão "Cancelar" (mais seguro)
// Tab trap: only Cancelar and Confirmar buttons reachable
```

---

### All Test Files (Vitest, node environment)

**Analog:** `src/app/actions/create-lesson.test.ts` (lines 1-80)

**Mock setup pattern** (lines 1-24):
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));
vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
```

**For admin-client actions** (grant-enrollment.ts etc.), also mock:
```typescript
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));
```

**Supabase chain mock pattern** (lines 54-72):
```typescript
const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "uuid" }, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};
const supabase = {
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
  from: vi.fn().mockReturnValue(mockQuery),
};
vi.mocked(createSupabaseServerClient).mockResolvedValue(
  supabase as unknown as Awaited<ReturnType<typeof createSupabaseServerClient>>,
);
```

**Test case for 23505 slug collision** (upsert-course.test.ts):
```typescript
it("retorna erro de slug duplicado quando Postgres retorna 23505", async () => {
  // ... mock insert to return { data: null, error: { code: "23505", message: "duplicate key..." } }
  const result = await createCourseAction(initialState, makeValidFormData());
  expect(result.success).toBe(false);
  expect(result.message).toContain("slug");
});
```

**Schema test pattern** (extend existing schema.test.ts):
```typescript
// src/lib/courses/schema.test.ts additions
describe("publishCourseSchema", () => {
  it("aceita courseId UUID válido", () => {
    const result = publishCourseSchema.safeParse({ courseId: "11111111-1111-4111-8111-111111111111" });
    expect(result.success).toBe(true);
  });
  it("rejeita courseId inválido", () => {
    const result = publishCourseSchema.safeParse({ courseId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
```

---

## Shared Patterns

### Admin Role Guard
**Source:** `src/app/actions/upsert-course.ts` lines 11-32 (extracted `requireAdminUser`)
**Apply to:** All new server actions under `src/app/actions/`
```typescript
async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) { logger.error("Failed to load authenticated session on course admin action", error.message); }
  if (!user) { return { supabase, user: null as null, errorMessage: "Sessao expirada. Atualize a pagina e tente novamente." }; }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") { return { supabase, user: null as null, errorMessage: "Voce nao tem permissao para gerenciar cursos." }; }
  return { supabase, user, errorMessage: null as string | null };
}
```

### FormState Shape
**Source:** `src/app/actions/course-form-state.ts` (all 10 lines)
**Apply to:** Every new action — create sibling `*-form-state.ts` files or inline the type
```typescript
export type XFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
export const initialXState: XFormState = { success: false, message: "" };
```

### useActionState + useFormStatus Form Pattern
**Source:** `src/app/admin/course-manager.tsx` lines 35-50
**Apply to:** All new `"use client"` form components
```typescript
const [state, formAction] = useActionState<XFormState, FormData>(myAction, initialXState);
// In button:
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? pendingLabel : label}</button>;
}
```

### Logger Usage
**Source:** `src/app/actions/create-module.ts` lines 48, 73 + `src/lib/courses/queries.ts` line 120
**Apply to:** All server-side code (actions, queries, API routes)
```typescript
import { logger } from "@/lib/logger";
// Operational errors (DB, network): logger.error(message, details)
// Unexpected/alertable: captureException(new Error(...), { extra: ... }) from @sentry/nextjs
```

### Zod Preprocess for FormData
**Source:** `src/lib/courses/schema.ts` lines 6-16 + `src/lib/modules/schema.ts` lines 16-34
**Apply to:** All new Zod schemas in `src/lib/**/schema.ts`
```typescript
function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
const optionalTextSchema = z.preprocess(normalizeOptionalText, z.string().optional());
```

### Supabase Typed Client Usage
**Source:** `src/lib/courses/queries.ts` lines 1-22
**Apply to:** All new queries and actions
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
type SupabaseServerClient = SupabaseClient<Database>;
// Always pass the Database generic; never use untyped from()
```

### revalidatePath After Mutations
**Source:** `src/app/actions/upsert-course.ts` lines 75-79
**Apply to:** All server actions that modify courses/modules/lessons/enrollments
```typescript
function revalidateCoursePages() {
  revalidatePath("/admin");
  revalidatePath("/admin/cursos");
  revalidatePath(`/admin/cursos/${slug}`, "page");
  revalidatePath("/dashboard");
  revalidatePath("/curso/[slug]", "page");
}
```

### FeedbackBanner (success/error)
**Source:** `src/app/admin/usuarios/user-manager.tsx` lines 55-78
**Apply to:** All admin form components
```tsx
{state.message && (
  <div role="status" aria-live="polite"
    className={`rounded-lg px-3 py-2 text-sm border ${
      state.success
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}>
    {state.message}
  </div>
)}
```

### FieldError Component
**Source:** `src/app/admin/course-manager.tsx` (FieldError usage pattern)
**Apply to:** All form fields with Zod validation
```tsx
function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/admin/breadcrumb.tsx` | component | — | Nenhum breadcrumb component existe no projeto |
| `src/components/admin/reorder-buttons.tsx` | component | event-driven | Nenhum padrão de reordenação existe |
| `src/components/admin/status-badge.tsx` | component | transform | Badges existem no marketing mas com semântica diferente |
| `src/components/admin/confirmation-dialog.tsx` | component | event-driven | Nenhum dialog/modal existe no projeto |
| `src/lib/database.types.ts` (hand-edit) | model | — | Edição manual — sem analog |

Para esses arquivos, o planner deve usar as especificações concretas da seção UI-SPEC Component Library (Components 8, 9, 11) como fonte primária.

---

## Metadata

**Analog search scope:** `src/app/actions/`, `src/app/admin/`, `src/lib/courses/`, `src/lib/modules/`, `src/lib/lessons/`, `src/lib/materials/`, `src/lib/marketing/`, `supabase/migrations/`, `src/components/admin/`
**Files read:** 18
**Pattern extraction date:** 2026-04-28
