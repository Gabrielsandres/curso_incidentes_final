# Phase 5: B2B Institution Manager — Pattern Map

**Mapped:** 2026-05-02
**Files analyzed:** 19 (16 new + 3 modified — Edge Function, middleware, call-admin-user-function)
**Analogs found:** 18 / 19 (only `progress-matrix.tsx` has no exact in-tree analog — see §No Analog Found)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/admin/instituicoes/page.tsx` | RSC page (admin list) | request-response (read) | `src/app/admin/cursos/page.tsx` | exact |
| `src/app/admin/instituicoes/nova/page.tsx` | RSC page (admin shell + form host) | request-response (read) | `src/app/admin/cursos/novo/page.tsx` | exact |
| `src/app/admin/instituicoes/nova/new-institution-form.tsx` | client component (form) | request-response (form action) | `src/app/admin/cursos/novo/new-course-form.tsx` | exact |
| `src/app/admin/instituicoes/[slug]/page.tsx` | RSC page (admin detail + member list) | request-response (read) | `src/app/admin/cursos/[slug]/alunos/page.tsx` | exact |
| `src/app/admin/instituicoes/institution-manager.tsx` | client component (tabbed form + list) | request-response (multiple actions) | `src/components/admin/grant-enrollment-dialog.tsx` + `src/app/admin/usuarios/user-manager.tsx` | role-match (composite) |
| `src/app/admin/instituicoes/promote-manager-button.tsx` | client component (action button + dialog) | request-response (mutation) | `src/app/admin/cursos/[slug]/alunos/revoke-enrollment-button.tsx` | exact |
| `src/app/admin/instituicoes/detach-member-button.tsx` | client component (action button + dialog) | request-response (mutation) | `src/app/admin/cursos/[slug]/alunos/revoke-enrollment-button.tsx` | exact |
| `src/app/gestor/page.tsx` | RSC page (manager dashboard) | request-response (read) | `src/app/dashboard/page.tsx` (frame) + `src/app/admin/cursos/[slug]/alunos/page.tsx` (admin client read) | role-match (composite) |
| `src/app/gestor/layout.tsx` | RSC layout (header shell) | request-response (read) | `src/app/dashboard/page.tsx` header block (no separate layout exists today; create one for /gestor) | partial (structural mirror) |
| `src/app/gestor/progress-matrix.tsx` | RSC component (matrix table) | request-response (read) | NEW (no in-tree HTML matrix) — copy table semantics from `src/app/admin/cursos/[slug]/alunos/page.tsx:193-258` | partial |
| `src/app/gestor/institution-certificates-table.tsx` | RSC component (read-only table) | request-response (read) | `src/components/certificates/my-certificates.tsx` (typography only — strip download) + alunos table shape | partial |
| `src/lib/institutions/queries.ts` | server-only data module | request-response (read, batched) | `src/lib/courses/queries.ts` (esp. `getAvailableCourses` for batched progress; `getAdminCourseList` for admin list shape) | exact |
| `src/lib/institutions/schema.ts` | Zod schema module | validation/transform | `src/lib/courses/schema.ts` | exact |
| `src/lib/institutions/types.ts` | TypeScript types module | type definitions | `src/lib/courses/types.ts` | exact |
| `src/app/actions/upsert-institution.ts` | server action | CRUD (create/update) | `src/app/actions/upsert-course.ts` | exact |
| `src/app/actions/upsert-institution-state.ts` | shared form-state type | type definition | `src/app/actions/course-form-state.ts` | exact |
| `src/app/actions/attach-institution-member.ts` | server action | CRUD (insert) | `src/app/actions/grant-enrollment.ts` (`grantEnrollmentBatchAction`) | exact |
| `src/app/actions/promote-institution-manager.ts` | server action | CRUD (RPC call) | `src/app/actions/grant-enrollment.ts` (skeleton) + `src/app/actions/upsert-course.ts` (Zod parse pattern) | role-match (RPC is novel) |
| `src/app/actions/detach-institution-member.ts` | server action | CRUD (delete) | `src/app/actions/revoke-enrollment.ts` | exact |
| `src/app/actions/search-students-for-institution.ts` | server action (function call, not form action) | request-response (read) | `src/app/admin/cursos/[slug]/alunos/page.tsx:80-120` (admin search-via-listUsers pattern) | role-match |
| `src/app/actions/upsert-institution.test.ts` | Vitest test | test | `src/app/actions/grant-enrollment.test.ts` | exact |
| `src/app/actions/attach-institution-member.test.ts` | Vitest test | test | `src/app/actions/grant-enrollment.test.ts` | exact |
| `src/app/actions/promote-institution-manager.test.ts` | Vitest test | test | `src/app/actions/grant-enrollment.test.ts` | exact |
| `src/app/actions/detach-institution-member.test.ts` | Vitest test | test | `src/app/actions/grant-enrollment.test.ts` | exact |
| `src/lib/institutions/queries.test.ts` | Vitest test | test | `src/lib/courses/queries.test.ts` (mocked Supabase chain pattern) | exact |
| `src/components/admin/member-role-badge.tsx` | dumb presentational | type definition | `src/components/admin/status-badge.tsx` | exact |
| `src/components/marketing/mdhe-contact-card.tsx` | dumb presentational | type definition | NEW (no exact analog) — copy spacing+typography from `src/app/admin/cursos/page.tsx:93-104` empty-state card | partial |
| `supabase/migrations/0014_promote_institution_manager_rpc.sql` | DB migration (SECURITY DEFINER RPC) | SQL DDL | `supabase/migrations/0013_institutions_enrollments.sql:30-55` (`is_member_of_institution` helper) | exact (pattern: SECURITY DEFINER + search_path lockdown) |
| `docs/email-templates.md` | docs (manual deploy artifact) | reference | NEW (no analog — first email template doc) | none (out of scope for in-code mirror) |
| **MODIFIED:** `middleware.ts` | edge runtime gate | request-response | `middleware.ts:60-77` (existing 3-ring pattern — extend with 4th ring) | exact (self-similar) |
| **MODIFIED:** `supabase/functions/Criar-usuario/index.ts` | Edge Function | request-response | `supabase/functions/Criar-usuario/index.ts:342-412` (existing invite branch — extend in place) | exact (self-similar) |
| **MODIFIED:** `src/lib/admin/call-admin-user-function.ts` | browser fetch wrapper | request-response | `src/lib/admin/call-admin-user-function.ts:1-21` (extend `CreateAdminUserPayload` type) | exact (self-similar) |
| **MODIFIED:** `src/app/dashboard/page.tsx` | RSC | request-response | self (add 1 nav button + orphan-flash banner conditional on `?notice=orphan-manager`) | exact (self-similar) |

---

## Pattern Assignments

### `src/app/admin/instituicoes/page.tsx` (RSC page, admin list)

**Analog:** `src/app/admin/cursos/page.tsx`

**Imports + metadata + auth gate** (lines 1-46):
```typescript
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminCourseList } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Catálogo de cursos | Admin — Gestão de Incidentes",
};

export default async function AdminCursosPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logger.error("Failed to load authenticated session on /admin/cursos", error.message);
  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin/cursos" });
    redirect(`/login?${search.toString()}`);
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") redirect("/dashboard");

  const courses = await getAdminCourseList(supabase);
  // ...
}
```

**Page frame (header + main with max-w-6xl)** (lines 64-91):
```typescript
return (
  <div className="flex min-h-screen flex-col bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-base font-semibold text-slate-900">
          Gestão de Incidentes · <span className="font-normal text-slate-500">Área restrita (admin)</span>
        </span>
        <LogoutButton />
      </div>
    </header>
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CATÁLOGO</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Catálogo de cursos</h1>
        <p className="mt-1 text-sm text-slate-600">Gerencie cursos publicados, rascunhos e arquivados.</p>
        {/* stats line */}
        <div className="mt-4">
          <Link
            href="/admin/cursos/novo"
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Novo curso
          </Link>
        </div>
      </div>
      {/* ...list or empty state... */}
    </main>
  </div>
);
```

**Empty state card** (lines 93-104) — apply for "Nenhuma instituição cadastrada":
```typescript
<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center gap-3">
  <BookOpen size={32} className="text-slate-400" aria-hidden="true" />
  <p className="text-sm font-semibold text-slate-700">Nenhum curso cadastrado</p>
  <p className="text-sm text-slate-500">Crie o primeiro curso para começar.</p>
  <Link href="/admin/cursos/novo" className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 ...">
    Novo curso
  </Link>
</div>
```

**List row card** (lines 110-153) — adapt for instituição rows (Building2 icon swap, columns: Nome | Slug | # alunos | gestor):
```typescript
<article key={course.id} className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 ${isArquivado ? "opacity-60" : ""}`}>
  <div className="flex flex-1 flex-col gap-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-slate-900 truncate">{course.title}</span>
      <StatusBadge status={status} />
    </div>
    <p className="text-xs text-slate-500 truncate">{course.slug}</p>
    <p className="text-xs text-slate-500">Criado em {formatDate(course.created_at)}</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Link href={`/admin/cursos/${course.slug}`} className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 ...">Editar</Link>
  </div>
</article>
```

---

### `src/app/admin/instituicoes/nova/page.tsx` (RSC page shell)

**Analog:** `src/app/admin/cursos/novo/page.tsx`

**Full page shape** (lines 1-65) — copy verbatim, swap CATÁLOGO → INSTITUIÇÕES, breadcrumb labels, and form import:
```typescript
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NewCourseForm } from "./new-course-form";

export const metadata: Metadata = { title: "Novo curso | Admin — Gestão de Incidentes" };

export default async function NovoCursoPage() {
  // [same auth gate as list page above]
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="..."><LogoutButton /></header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CATÁLOGO</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Novo curso</h1>
          <div className="mt-2">
            <Breadcrumb items={[
              { label: "Catálogo", href: "/admin/cursos" },
              { label: "Novo curso" },
            ]} />
          </div>
        </div>
        <NewCourseForm />
      </main>
    </div>
  );
}
```

---

### `src/app/admin/instituicoes/nova/new-institution-form.tsx` (client form)

**Analog:** `src/app/admin/cursos/novo/new-course-form.tsx`

**`useActionState` + slug auto-fill** (lines 1-44):
```typescript
"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createCourseAction } from "@/app/actions/upsert-course";
import { initialCourseFormState, type CourseFormState } from "@/app/actions/course-form-state";
import { slugify } from "@/lib/courses/slugify";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
      {pending ? "Salvando..." : "Salvar rascunho"}
    </button>
  );
}

export function NewCourseForm() {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    createCourseAction, initialCourseFormState,
  );
  const [titleValue, setTitleValue] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);
  const slugSuggestion = titleValue ? slugify(titleValue) : "";

  useEffect(() => {
    if (!slugTouched && slugRef.current && slugSuggestion) {
      slugRef.current.value = slugSuggestion;
    }
  }, [slugSuggestion, slugTouched]);
  // ...
}
```

**Card + label + input pattern** (lines 46-85):
```typescript
<div className="rounded-2xl border border-slate-200 bg-white p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CURSO</p>
  <h2 className="mt-1 text-xl font-semibold text-slate-900">Detalhes do curso</h2>
  <form action={formAction} className="mt-6 space-y-4">
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Título *</span>
      <input type="text" name="title" required placeholder="Ex.: ..."
        value={titleValue} onChange={(e) => setTitleValue(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
      <FieldError errors={state.fieldErrors?.title} />
    </label>
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">Slug *</span>
      <input ref={slugRef} type="text" name="slug" required onChange={() => setSlugTouched(true)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm ..." />
      <p className="text-xs text-slate-500">Use apenas letras minúsculas, números e hifens.</p>
      {!slugTouched && slugSuggestion && (
        <p className="text-xs italic text-slate-400">Sugestão: {slugSuggestion}</p>
      )}
      <FieldError errors={state.fieldErrors?.slug} />
    </label>
    {/* ...email + telefone... */}
  </form>
</div>
```

**Status banner (success/error)** (lines 168-180) — also reusable in `institution-manager.tsx`:
```typescript
{state.message ? (
  <div role="status" aria-live="polite"
    className={`rounded-lg px-3 py-2 text-sm border ${
      state.success
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}>
    {state.message}
  </div>
) : null}
```

---

### `src/app/admin/instituicoes/[slug]/page.tsx` (RSC detail page)

**Analog:** `src/app/admin/cursos/[slug]/alunos/page.tsx`

**Async params + RSC-side admin client + parallel fetches** (lines 34-130):
```typescript
export default async function AlunosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logger.error("Failed to load authenticated session on alunos page", error.message);
  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/admin/cursos/${slug}/alunos` });
    redirect(`/login?${search.toString()}`);
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") redirect("/dashboard");

  const course = await getAdminCourseBySlug(slug, supabase);
  if (!course) notFound();

  const adminClient = createSupabaseAdminClient();

  // Pattern: fetch profiles + auth.users (for emails) + build available-students set
  const { data: enrollments, error: enrollmentsError } = await adminClient
    .from("enrollments")
    .select("id, user_id, source, granted_at, expires_at")
    .eq("course_id", course.id)
    .order("granted_at", { ascending: false })
    .limit(200);
  // ...
  const { data: allAuthUsers } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authEmailMap = new Map<string, string>();
  for (const u of allAuthUsers?.users ?? []) {
    if (u.email) authEmailMap.set(u.id, u.email);
  }
}
```

**Stats card + render decision (table vs empty)** (lines 159-260): copy the rounded card with stats line + main CTA layout.

---

### `src/app/admin/instituicoes/institution-manager.tsx` (composite client)

**Analogs:** `src/components/admin/grant-enrollment-dialog.tsx` (tabbed form + autocomplete) + `src/app/admin/usuarios/user-manager.tsx` (Edge Function invite call)

**Tabbed pattern** (`grant-enrollment-dialog.tsx:197-212`):
```typescript
<div className="flex border-b border-slate-200 px-6">
  {(["list", "invite"] as Tab[]).map((t) => (
    <button key={t} type="button" onClick={() => setTab(t)}
      className={`-mb-px border-b-2 px-1 pb-3 pt-3 text-sm font-medium transition ${
        tab === t ? "border-sky-600 text-sky-600" : "border-transparent text-slate-500 hover:text-slate-700"
      } ${t === "invite" ? "ml-6" : ""}`}>
      {t === "list" ? "Adicionar aluno existente" : "Convidar novo aluno"}
    </button>
  ))}
</div>
```

**Search input with debounce hook + autocomplete results list** (`grant-enrollment-dialog.tsx:249-311`):
```typescript
<div className="relative">
  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
  <input
    ref={searchRef}
    type="search"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Buscar por nome ou email…"
    className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
  />
</div>
{/* Result list */}
<ul className="divide-y divide-slate-100" role="listbox" aria-multiselectable="true">
  {filtered.map((student) => (
    <li key={student.id}>
      <label className="flex cursor-pointer items-center gap-3 py-2.5 hover:bg-slate-50">
        <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(student.id)} className="h-4 w-4 ..." />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{student.fullName}</p>
          <p className="truncate text-xs text-slate-500">{student.email}</p>
        </div>
      </label>
    </li>
  ))}
</ul>
```

**Note:** UI-SPEC says embed inline (not modal), so omit the `fixed inset-0 z-50` overlay wrapper. Use plain `<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">` like `user-manager.tsx:83`.

**Invite form via callAdminUserFunction** (`user-manager.tsx:48-80`):
```typescript
try {
  const result = await callAdminUserFunction({
    action: "invite",
    email,
    full_name,
    institution_id: institutionId,  // <-- NEW for Phase 5
  });
  if (!result.ok) {
    setErrorMessage(result.message);
    return;
  }
  const responseMessage = /* extract from result.data.message */;
  setSuccessMessage(responseMessage);
  form.reset();
} catch (error) {
  setErrorMessage("Nao foi possivel enviar o convite. Tente novamente.");
} finally {
  setIsSubmitting(false);
}
```

**`useActionState` + `useTransition` for batch attach** (`grant-enrollment-dialog.tsx:71-79, 135-149`):
```typescript
const [, startTransition] = useTransition();
const [batchState, batchFormAction, isBatchPending] = useActionState<EnrollmentFormState, FormData>(
  grantEnrollmentBatchAction,
  initialEnrollmentState,
);

function handleBatchGrant() {
  const formData = new FormData();
  formData.set("course_id", courseId);
  for (const id of selected) formData.append("user_ids[]", id);
  startTransition(() => { batchFormAction(formData); });
}
```

**Loader2 pending indicator** (`grant-enrollment-dialog.tsx:337-345`):
```typescript
{isBatchPending ? (
  <>
    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
    Concedendo…
  </>
) : (
  "Conceder acesso"
)}
```

---

### `src/app/admin/instituicoes/promote-manager-button.tsx` & `detach-member-button.tsx`

**Analog:** `src/app/admin/cursos/[slug]/alunos/revoke-enrollment-button.tsx`

**Full button + dialog wrapper** (lines 1-61) — copy verbatim, swap action import:
```typescript
"use client";
import { useActionState, useState, useTransition } from "react";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { revokeEnrollmentAction } from "@/app/actions/revoke-enrollment";
import { initialRevokeState } from "@/app/actions/revoke-enrollment-state";

export function RevokeEnrollmentButton({ enrollmentId, courseSlug, email }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(revokeEnrollmentAction, initialRevokeState);

  function handleConfirm() {
    setDialogOpen(false);
    const formData = new FormData();
    formData.set("enrollment_id", enrollmentId);
    formData.set("course_slug", courseSlug);
    startTransition(() => { formAction(formData); });
  }

  return (
    <>
      {state.success === false && state.message && (
        <p className="sr-only" role="alert" aria-live="polite">{state.message}</p>
      )}
      <button type="button" onClick={() => setDialogOpen(true)} disabled={isPending}
        aria-label={`Revogar acesso de ${email}`}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
        <UserMinus size={16} aria-hidden="true" />
        Revogar acesso
      </button>
      <ConfirmationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Revogar acesso?"
        body={`O aluno ${email} perderá acesso imediato ao curso. Progresso e certificados já emitidos são preservados.`}
        confirmLabel="Revogar acesso"
        pendingLabel="Revogando..."
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  );
}
```

**Promote-button variant rule (UI-SPEC §Promover hierarchy):** open the dialog ONLY when a prior manager exists; when no prior manager, call `formAction` directly (no dialog) — see `course-archive-button.tsx:18-25` for the no-dialog `startTransition(async () => { ... await action(...) })` shape.

---

### `src/app/gestor/page.tsx` (manager dashboard RSC)

**Analogs:** `src/app/dashboard/page.tsx` (frame) + `src/app/admin/cursos/[slug]/alunos/page.tsx` (admin client read pattern for D-12 bypass)

**Frame (header + main)** — copy `dashboard/page.tsx:71-103`, swap eyebrow/copy. Suspense wrap for matrix block per UI-SPEC §Loading:
```typescript
<div className="flex min-h-screen flex-col bg-slate-50">
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
      <div className="flex flex-col">
        <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
        <span className="text-xs text-slate-500">Painel da instituição · Olá, {userName}</span>
      </div>
      <LogoutButton />
    </div>
  </header>
  <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Hero — institution name + counts */}
    </section>
    <section className="space-y-4">
      <Suspense fallback={<MatrixSkeleton />}>
        <ProgressMatrix institutionId={inst.id} />
      </Suspense>
    </section>
    <section className="space-y-4">
      <InstitutionCertificatesTable institutionId={inst.id} />
    </section>
  </main>
</div>
```

**Auth + role gate + orphan check** — middleware already gates role; this page handles orphan (D-02):
```typescript
const supabase = await createSupabaseServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect(`/login?redirectTo=/gestor`);

// Resolve manager's institution
const inst = await getInstitutionForManager(supabase, user.id);
if (!inst) {
  redirect("/dashboard?notice=orphan-manager");
}
```

---

### `src/app/gestor/layout.tsx` (manager layout shell)

**Analog:** No separate `layout.tsx` exists for `/dashboard` — header is inline in `page.tsx`. Pattern: extract the header into the layout when the same shell is used by multiple `/gestor/*` routes (currently only `/gestor`, but `layout.tsx` lives in scope for future expansion).

**Pattern to copy (header structure from `dashboard/page.tsx:73-81`):**
```typescript
import { LogoutButton } from "@/components/auth/logout-button";

export default function GestorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
```

**Note:** Hero greeting "Olá, {nome}" must be in `page.tsx` (needs the resolved user/institution data), not the layout.

---

### `src/app/gestor/institution-certificates-table.tsx` (RSC certificates table)

**Analog:** `src/components/certificates/my-certificates.tsx` (typography only) + `src/app/admin/cursos/[slug]/alunos/page.tsx:193-258` (table shell).

**Table shell** (`alunos/page.tsx:193-217`):
```typescript
<table className="w-full text-left">
  <caption className="sr-only">Certificados emitidos para alunos da sua equipe</caption>
  <thead className="border-b border-slate-200 bg-slate-50">
    <tr>
      <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">Aluno</th>
      <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">Curso</th>
      <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">Data de emissão</th>
      <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">Código</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-100">
    {/* rows */}
  </tbody>
</table>
```

**Section eyebrow + heading** (from `my-certificates.tsx:84-92`):
```typescript
<header className="flex flex-wrap items-start justify-between gap-3">
  <div>
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Certificados</p>
    <h2 className="text-xl font-semibold text-slate-900">Certificados emitidos</h2>
    <p className="mt-1 text-sm text-slate-600">Lista de certificados gerados para alunos da sua equipe.</p>
  </div>
</header>
```

**Code monospace cell (UI-SPEC D-15):** `<td className="px-4 py-3"><span className="font-mono text-xs text-slate-700 select-all">{cert.certificate_code}</span></td>` — no link, no download (D-15).

**Date format (`alunos/page.tsx:25-32`):**
```typescript
function formatDate(iso: string | null): string {
  if (!iso) return "Sem expiração";
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}
```
For Phase 5 cert table: use `toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" })` per UI-SPEC.

---

### `src/lib/institutions/queries.ts` (data module)

**Analog:** `src/lib/courses/queries.ts`

**Module shape — typed client + resolveClient + logger** (lines 1-55):
```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = SupabaseClient<Database>;

async function resolveClient(client?: SupabaseServerClient) {
  if (client) return client;
  return createSupabaseServerClient();
}
```

**`getAvailableCourses` batched-progress pattern** (lines 122-207) — adapt for `getInstitutionMembersWithProgress` (RESEARCH §Code Examples §Example 1):
```typescript
export async function getAvailableCourses(client?: SupabaseServerClient, userId?: string): Promise<CourseSummary[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("courses")
    .select(`
      id, slug, title, ...,
      modules ( id, position, deleted_at, lessons ( id, position, deleted_at ) )
    `)
    .not("published_at", "is", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar cursos disponiveis", error.message);
    return [];
  }

  // Collect all lesson IDs across courses (batched)
  const uniqueLessonIds = Array.from(new Set(/* ... */));

  // Single query for all progress
  const progressByLessonId = await getLessonProgressByLessonId(supabase, userId, uniqueLessonIds);

  // Reduce to per-course completion stats
  return /* ... */;
}
```

**`getAdminCourseList` shape (admin list query)** (lines 504-519):
```typescript
export async function getAdminCourseList(client?: SupabaseServerClient): Promise<CourseRow[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, ...")
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar cursos para admin", { error: error.message });
    return [];
  }

  return (data as CourseRow[]) ?? [];
}
```

**`getUserCertificatesByCourseId` map-by-id pattern** (lines 475-502) — adapt for institution certificates:
```typescript
export async function getUserCertificatesByCourseId(userId: string | undefined, client?: SupabaseServerClient): Promise<Map<string, CourseCertificateRow>> {
  const certificatesByCourseId = new Map<string, CourseCertificateRow>();
  if (!userId) return certificatesByCourseId;
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("course_certificates")
    .select("id, user_id, course_id, issued_at, certificate_code, ...")
    .eq("user_id", userId);
  if (error) {
    logger.error("Falha ao carregar certificados do usuario", { userId, error: error.message });
    return certificatesByCourseId;
  }
  /* ... */
  return certificatesByCourseId;
}
```

**Admin-bypass justification comment (RESEARCH Pattern 3):** every function in `queries.ts` that uses admin client must include the BYPASS JUSTIFICATION block — see RESEARCH §Code Examples §Example 1 lines 740-742.

---

### `src/lib/institutions/schema.ts` (Zod schemas)

**Analog:** `src/lib/courses/schema.ts`

**Slug regex shared with courses** (lines 3):
```typescript
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
```

**Optional-text preprocessor** (lines 7-16):
```typescript
function normalizeOptionalText(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}
const optionalTextSchema = z.preprocess(normalizeOptionalText, z.string().optional());
```

**Base schema + create/update split via `.extend({ ...id })` + `.superRefine()` for cross-field validation** (lines 69-156):
```typescript
const baseCourseSchema = z.object({
  slug: z.string({ required_error: "Slug e obrigatorio." })
    .trim()
    .min(1, { message: "Slug e obrigatorio." })
    .regex(slugRegex, { message: "Use apenas letras minusculas, numeros e hifens no slug." }),
  title: z.string({ required_error: "Titulo e obrigatorio." })
    .trim()
    .min(1, { message: "Titulo e obrigatorio." }),
  description: optionalTextSchema.transform((value) => value ?? null),
});

export const createCourseSchema = baseCourseSchema.superRefine((input, context) => { /* ... */ });
export const updateCourseSchema = baseCourseSchema
  .extend({
    courseId: z.string({ required_error: "Curso e obrigatorio." }).uuid({ message: "Curso invalido." }),
  })
  .superRefine((input, context) => { /* ... */ });

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
```

**Phase 5 additions:** `createInstitutionSchema` (name + slug + contact_email optional + phone optional), `attachMemberSchema` (institution_id UUID + profile_id UUID), `inviteMemberSchema` (institution_id UUID + full_name + email), `promoteManagerSchema` (institution_id UUID + profile_id UUID + institution_slug for revalidatePath), `detachMemberSchema` (institution_id UUID + profile_id UUID + institution_slug).

---

### `src/lib/institutions/types.ts` (types module)

**Analog:** `src/lib/courses/types.ts` (lines 1-62)

**Pattern:**
```typescript
import type { Database } from "@/lib/database.types";

export type InstitutionRow = Database["public"]["Tables"]["institutions"]["Row"];
export type InstitutionMemberRow = Database["public"]["Tables"]["institution_members"]["Row"];
export type InstitutionMemberRole = "student" | "manager";

// Composite types for UI
export type InstitutionWithStats = InstitutionRow & {
  memberCount: number;
  hasManager: boolean;
};

export type InstitutionMemberWithProfile = InstitutionMemberRow & {
  profile: { full_name: string; email: string | null };
};

export type MatrixCell = {
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
  enrollmentExpired: boolean;
};

export type InstitutionMemberWithProgress = {
  profileId: string;
  fullName: string;
  memberRole: InstitutionMemberRole;
  courses: MatrixCell[];
};

export type InstitutionCertificateRow = {
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  certificateCode: string;
};
```

---

### `src/app/actions/upsert-institution.ts` (server action)

**Analog:** `src/app/actions/upsert-course.ts`

**Imports + `requireAdminUser` helper** (lines 1-39) — copy verbatim, only the error message string differs:
```typescript
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { CourseFormState } from "@/app/actions/course-form-state";
import { fetchUserRole } from "@/lib/auth/roles";
import { createCourseSchema, updateCourseSchema /* ... */ } from "@/lib/courses/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logger.error("Failed to load authenticated session on course admin action", error.message);
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

**Action shape: parse → auth → mutate → format-error → revalidate → return** (lines 89-131):
```typescript
export async function createCourseAction(_prevState: CourseFormState, formData: FormData): Promise<CourseFormState> {
  const parsed = createCourseSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    /* ... */
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const { error } = await auth.supabase.from("courses").insert(buildCoursePayload(parsed.data)).select("id").single();

  if (error) {
    logger.error("Falha ao criar curso", { error: error.message, code: error.code });
    return { success: false, message: formatSupabaseInsertOrUpdateError(error) };
  }

  revalidateCoursePages();
  redirect(`/admin/cursos/${parsed.data.slug}`);
}
```

**Postgres error code translation** (lines 67-80):
```typescript
function formatSupabaseInsertOrUpdateError(error: { code?: string | null; message?: string | null }) {
  const permissionDenied = error.code === "42501" || (error.message ?? "").toLowerCase().includes("permission denied");
  const uniqueViolation = error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");
  if (permissionDenied) return "Voce nao tem permissao para salvar cursos (RLS).";
  if (uniqueViolation) return "Ja existe um curso com este slug. Escolha outro slug.";
  return "Nao foi possivel salvar o curso. Tente novamente.";
}
```
For institutions: same shape, swap copy: "Já existe uma instituição com este slug."

**Revalidate helper** (lines 82-87):
```typescript
function revalidateCoursePages() {
  revalidatePath("/admin");
  revalidatePath("/admin/cursos");
  revalidatePath("/dashboard");
  revalidatePath("/curso/[slug]", "page");
}
```
For institutions: `revalidatePath("/admin"); revalidatePath("/admin/instituicoes"); revalidatePath("/admin/instituicoes/[slug]", "page"); revalidatePath("/gestor");`

---

### `src/app/actions/attach-institution-member.ts` (server action — insert)

**Analog:** `src/app/actions/grant-enrollment.ts` (`grantEnrollmentBatchAction`)

**Imports + `requireAdminUser` (DIFFERENT helper than upsert — uses admin client)** (lines 1-43):
```typescript
"use server";
import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnrollmentFormState } from "./grant-enrollment-state";

export type { EnrollmentFormState };

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logger.error("Failed to load authenticated session on admin action", error.message);
  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessão expirada. Atualize a página e tente novamente." };
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Você não tem permissão para gerenciar acessos." };
  }
  return { supabase, user, errorMessage: null as string | null };
}
```

**Admin-client upsert pattern** (lines 45-92):
```typescript
export async function grantEnrollmentBatchAction(_prevState: EnrollmentFormState, formData: FormData): Promise<EnrollmentFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const userIds = formData.getAll("user_ids[]").map((v) => String(v).trim()).filter(Boolean);
  const courseId = String(formData.get("course_id") ?? "").trim();

  if (userIds.length === 0 || !courseId) {
    return { success: false, message: "Selecione pelo menos um aluno." };
  }

  const adminClient = createSupabaseAdminClient();
  const rows = userIds.map((userId) => ({
    user_id: userId,
    course_id: courseId,
    source: "admin_grant" as const,
    granted_at: new Date().toISOString(),
    expires_at: null,
  }));

  const { error } = await adminClient
    .from("enrollments")
    .upsert(rows, { onConflict: "user_id,course_id", ignoreDuplicates: true });

  if (error) {
    logger.error("Falha ao conceder acesso em lote", { courseId, error: error.message });
    captureException(new Error("Supabase upsert error (enrollments batch)"), {
      extra: { message: error.message, code: error.code },
    });
    return { success: false, message: "Não foi possível conceder acesso. Tente novamente." };
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return { success: true, /* ... */ };
}
```

**For Phase 5:** swap to `institution_members` table + `onConflict: "institution_id,profile_id"` + `revalidatePath('/admin/instituicoes/[slug]', 'page')`.

---

### `src/app/actions/promote-institution-manager.ts` (server action — RPC)

**Analogs:** `src/app/actions/grant-enrollment.ts` (auth gate skeleton) + `src/app/actions/upsert-course.ts` (Zod parse pattern). RPC call pattern is novel — see RESEARCH §Code Examples §Example 2.

**Concrete shape (from RESEARCH lines 873-932):**
```typescript
"use server";
import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  institution_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  institution_slug: z.string().min(1),
});

export type PromoteState = { success: boolean; message: string };

async function requireAdminUser() {
  // mirror grant-enrollment.ts:14-43
}

export async function promoteInstitutionManagerAction(
  _prev: PromoteState, formData: FormData,
): Promise<PromoteState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const parsed = inputSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) return { success: false, message: "Dados inválidos." };

  const adminClient = createSupabaseAdminClient();
  // ATOMIC: PostgREST wraps the RPC in a single transaction
  const { error } = await adminClient.rpc("promote_institution_manager", {
    p_institution_id: parsed.data.institution_id,
    p_new_manager_profile_id: parsed.data.profile_id,
  });

  if (error) {
    logger.error("Falha ao promover gestor", { error: error.message, ...parsed.data });
    captureException(new Error("promote_institution_manager RPC failed"), {
      extra: { message: error.message, code: error.code },
    });
    return { success: false, message: "Não foi possível promover o aluno a gestor. Atualize a página e tente novamente." };
  }

  revalidatePath(`/admin/instituicoes/${parsed.data.institution_slug}`);
  return { success: true, message: "Promoção concluída." };
}
```

---

### `src/app/actions/detach-institution-member.ts` (server action — delete)

**Analog:** `src/app/actions/revoke-enrollment.ts`

**Full file (lines 1-71)** — copy verbatim and swap `enrollments` → `institution_members`, swap key from `enrollment_id` to (`institution_id`, `profile_id`):
```typescript
"use server";
import { revalidatePath } from "next/cache";
import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RevokeEnrollmentState } from "./revoke-enrollment-state";

export type { RevokeEnrollmentState };

async function requireAdminUser() { /* ... mirror */ }

export async function revokeEnrollmentAction(_prevState: RevokeEnrollmentState, formData: FormData): Promise<RevokeEnrollmentState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) return { success: false, message: auth.errorMessage };

  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  if (!enrollmentId) return { success: false, message: "Identificador de matrícula inválido." };

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("enrollments").delete().eq("id", enrollmentId);

  if (error) {
    logger.error("Falha ao revogar acesso", { enrollmentId, error: error.message });
    return { success: false, message: "Não foi possível revogar o acesso. Tente novamente." };
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return { success: true, message: "Acesso revogado com sucesso." };
}
```

**Phase 5 detach delete:** `.delete().eq("institution_id", id).eq("profile_id", id)` (composite where clause; no surrogate `id` lookup needed).

---

### `src/app/actions/search-students-for-institution.ts` (server action — read)

**Analog:** `src/app/admin/cursos/[slug]/alunos/page.tsx:80-120` (admin client + listUsers + profile join pattern)

**Pattern:**
```typescript
"use server";
import { z } from "zod";
import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  institution_id: z.string().uuid(),
  query: z.string().trim().max(120),
});

export async function searchStudentsForInstitution(
  institutionId: string, query: string,
): Promise<Array<{ id: string; fullName: string; email: string }>> {
  // Auth gate (admin-only)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") return [];

  const parsed = inputSchema.safeParse({ institution_id: institutionId, query });
  if (!parsed.success || parsed.data.query.length < 2) return [];

  const adminClient = createSupabaseAdminClient();

  // Pattern from alunos/page.tsx:80-120
  const { data: members } = await adminClient
    .from("institution_members")
    .select("profile_id")
    .eq("institution_id", parsed.data.institution_id);
  const excludeIds = new Set((members ?? []).map((m) => m.profile_id));

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${parsed.data.query}%`)
    .eq("role", "student")
    .order("full_name")
    .limit(20);

  // Get emails via auth.admin.listUsers (profiles has no email column — VERIFIED RESEARCH line 1041)
  const { data: allAuthUsers } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map(allAuthUsers?.users.map((u) => [u.id, u.email ?? ""]) ?? []);

  return (profiles ?? [])
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => ({ id: p.id, fullName: p.full_name, email: emailById.get(p.id) ?? "" }))
    .filter((s) => {
      const q = parsed.data.query.toLowerCase();
      return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    });
}
```

---

### Test files (`*.test.ts` for actions and queries)

**Analog:** `src/app/actions/grant-enrollment.test.ts`

**Mock setup pattern (lines 1-46)** — copy block verbatim:
```typescript
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));
vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
```

**Mocked Supabase chain factory** (lines 49-95):
```typescript
function makeServerSupabase(overrides?: Partial<{ userId: string }>) {
  const userId = overrides?.userId ?? "admin-user-id";
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
  };
}

function makeAdminClientChain(overrides?: { upsertError?: { code: string; message: string } | null }) {
  const upsertError = overrides?.upsertError !== undefined ? overrides.upsertError : null;
  const enrollmentUpsertQuery = {
    upsert: vi.fn().mockResolvedValue({ data: null, error: upsertError }),
  };
  const adminClient = {
    auth: {
      admin: {
        inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: { id: "new-user-id" } }, error: null }),
      },
    },
    from: vi.fn((table: string) => {
      if (table === "enrollments") return enrollmentUpsertQuery;
      return {};
    }),
  };
  return { adminClient, enrollmentUpsertQuery };
}
```

**For `promote-institution-manager.test.ts`** — RPC mock instead of `from().upsert()`:
```typescript
const rpcSpy = vi.fn().mockResolvedValue({ error: null });
vi.mocked(createSupabaseAdminClient).mockReturnValue({ rpc: rpcSpy } as never);
// ...
expect(rpcSpy).toHaveBeenCalledWith("promote_institution_manager", {
  p_institution_id: "...",
  p_new_manager_profile_id: "...",
});
```
(See RESEARCH §Code Examples §Example 5 lines 1141-1183 for full test shape.)

---

### `src/app/actions/upsert-institution-state.ts` (form state type)

**Analog:** `src/app/actions/course-form-state.ts`

**Full file pattern (lines 1-10):**
```typescript
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

For Phase 5: `InstitutionFormState`, `initialInstitutionFormState`. Same shape — adopts the `EnrollmentFormState` simpler shape (no `fieldErrors`) for `attach-institution-member-state.ts`, `promote-state.ts`, `detach-state.ts` since they have no field-level validation.

---

### `src/components/admin/member-role-badge.tsx` (presentational)

**Analog:** `src/components/admin/status-badge.tsx`

**Full file pattern (lines 1-30)** — copy structure exactly:
```typescript
type CourseStatus = "rascunho" | "publicado" | "arquivado";

const statusClasses: Record<CourseStatus, string> = {
  rascunho: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300",
  publicado: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200",
  arquivado: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200",
};

const statusLabels: Record<CourseStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return <span className={statusClasses[status]}>{statusLabels[status]}</span>;
}
```

For Phase 5: `MemberRole = "manager" | "student"`. Manager class uses emerald per UI-SPEC: `inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-0.5 text-xs font-semibold` + `Crown` icon size 12. Student class: `inline-flex rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 text-xs font-medium`.

---

### `supabase/migrations/0014_promote_institution_manager_rpc.sql` (DB migration)

**Analog:** `supabase/migrations/0013_institutions_enrollments.sql:30-55` (`is_member_of_institution` SECURITY DEFINER helper)

**Function definition + search_path lockdown + grants** (0013 lines 30-55):
```sql
create or replace function public.is_member_of_institution(p_institution_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_is_member boolean;
begin
  select exists (
    select 1
    from public.institution_members im
    where im.institution_id = p_institution_id
      and im.profile_id = auth.uid()
  )
  into v_is_member;

  return coalesce(v_is_member, false);
exception
  when others then
    return false;
end;
$$;
```

**Phase 5 RPC** (full body in RESEARCH lines 602-657):
```sql
create or replace function public.promote_institution_manager(
  p_institution_id uuid,
  p_new_manager_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_manager_profile_id uuid;
begin
  -- 1. Find prior manager (if any)
  select profile_id into v_prior_manager_profile_id
  from public.institution_members
  where institution_id = p_institution_id
    and role = 'manager'
    and profile_id <> p_new_manager_profile_id
  limit 1;

  -- 2. Promote new manager
  update public.profiles set role = 'institution_manager' where id = p_new_manager_profile_id;
  update public.institution_members set role = 'manager'
    where institution_id = p_institution_id and profile_id = p_new_manager_profile_id;

  -- 3. Demote prior manager (if exists)
  if v_prior_manager_profile_id is not null then
    update public.institution_members set role = 'student'
      where institution_id = p_institution_id and profile_id = v_prior_manager_profile_id;

    -- If prior manager has no other manager rows globally, demote profiles.role too
    if not exists (
      select 1 from public.institution_members
      where profile_id = v_prior_manager_profile_id and role = 'manager'
    ) then
      update public.profiles set role = 'student' where id = v_prior_manager_profile_id;
    end if;
  end if;
end;
$$;

revoke all on function public.promote_institution_manager(uuid, uuid) from public;
grant execute on function public.promote_institution_manager(uuid, uuid) to service_role;
```

**Recommended companion (deferred for planner):** add `demote_institution_manager(p_institution_id uuid, p_profile_id uuid)` RPC for the inverse (UI-SPEC "Rebaixar a aluno"). Same SECURITY DEFINER pattern.

---

### `middleware.ts` (modified — add 4th ring)

**Analog:** self (`middleware.ts` lines 8-77 — extend existing 3-ring pattern)

**Existing 3-ring pattern (lines 8-77):**
```typescript
const PROTECTED_ROUTES = ["/dashboard", "/curso", "/admin"];
const ADMIN_ROUTES = ["/admin", "/dashboard/aulas"];
const AUTH_ROUTES = ["/login"];

function isProtectedPath(path: string) {
  return PROTECTED_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
function isAdminPath(path: string) {
  return ADMIN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  // ... session bootstrap ...
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user && isProtectedPath(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }
  if (user && AUTH_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (user && isAdminPath(path)) {
    const role = await fetchUserRole(supabase, user.id);
    if (role !== "admin") return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/curso/:path*", "/admin/:path*", "/login"],
};
```

**Phase 5 additions (RESEARCH Pattern 1 lines 364-390):**
1. Add `/gestor` to `PROTECTED_ROUTES`
2. Add `const GESTOR_ROUTES = ["/gestor"];` + `isGestorPath()` helper
3. Insert gestor-gate block AFTER existing admin gate:
```typescript
if (user && isGestorPath(path)) {
  const role = await fetchUserRole(supabase, user.id);
  if (role === "admin") {
    return NextResponse.redirect(new URL("/admin/instituicoes", request.url));
  }
  if (role !== "institution_manager") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}
```
4. Add `/gestor/:path*` to `config.matcher`

---

### `supabase/functions/Criar-usuario/index.ts` (modified — extend invite branch)

**Analog:** self (`Criar-usuario/index.ts` lines 342-412 — extend existing invite branch)

**Existing invite call (lines 353-359):**
```typescript
const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: {
    full_name: fullName,
    name: fullName,
  },
  redirectTo,
});
```

**Phase 5 extension (RESEARCH §Code Examples §Example 3, lines 942-1039):**
1. Add `institution_id?: string` to `InviteRequestBody`
2. Before invite call: if `institution_id` present, lookup `institutions.name` (404 if not found)
3. Spread `institution_name` into the `data` metadata only when present:
```typescript
const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  data: {
    full_name: fullName,
    name: fullName,
    ...(institutionName ? { institution_name: institutionName } : {}),
  },
  redirectTo,
});
```
4. After invite success, defensive profile upsert + insert into `institution_members` (Pitfall 6 — RESEARCH lines 994-1008):
```typescript
if (institutionId && inviteData.user?.id) {
  // Defensive profile upsert (Pitfall 6 — trigger race)
  await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: inviteData.user.id, full_name: fullName, role: 'student' },
      { onConflict: "id", ignoreDuplicates: true },
    );
  const { error: memberErr } = await supabaseAdmin
    .from("institution_members")
    .insert({ institution_id: institutionId, profile_id: inviteData.user.id, role: "student" });
  if (memberErr) {
    return jsonResponse({ ok: false, message: `Convite enviado, mas...`, warning: true, invited: true }, 207);
  }
  return jsonResponse({ ok: true, invited: true, message: `Convite enviado para ${email} da instituição ${institutionName}.` });
}
```

**Preserve existing `getOptionalEnv`, `getRequiredEnv`, CORS headers, bearer-token check, admin role validation, `isAlreadyRegisteredAuthError` logic — only ADD to the invite branch.**

---

### `src/lib/admin/call-admin-user-function.ts` (modified)

**Analog:** self (lines 1-21 — extend payload type)

**Existing payload type (lines 3-7):**
```typescript
type CreateAdminUserPayload = {
  action: "invite" | "create";
  email: string;
  full_name: string;
};
```

**Phase 5 extension:**
```typescript
type CreateAdminUserPayload = {
  action: "invite" | "create";
  email: string;
  full_name: string;
  institution_id?: string;  // NEW — when present, the Edge Function attaches the user to the institution
};
```

**Rest of file (auth bootstrap, fetch wrapper, error mapping at lines 86-149) — UNCHANGED.**

---

### `src/app/dashboard/page.tsx` (modified)

**Analog:** self (lines 105-135 — admin nav block)

**Existing admin nav block** (lines 105-135) — add a new `Link` to "Gerenciar instituições" matching the same pill style:
```typescript
{role === "admin" ? (
  <section className="...">
    <div>...</div>
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
        Gerenciar cursos
      </Link>
      {/* NEW for Phase 5 */}
      <Link href="/admin/instituicoes" className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
        Gerenciar instituições
      </Link>
      <Link href="/admin/usuarios" className="...">Cadastrar usuario</Link>
      <Link href="/dashboard/aulas/nova" className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
        Cadastrar aula
      </Link>
    </div>
  </section>
) : null}
```

**Orphan-manager flash banner (D-02):** check `searchParams.notice === "orphan-manager"` (RSC: read from `props.searchParams`) and render an amber banner above the welcome card:
```typescript
{notice === "orphan-manager" && (
  <div role="status" aria-live="polite"
    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
    Sua instituição ainda não foi configurada. Entre em contato com a MDHE.
  </div>
)}
```

---

## Shared Patterns

These cross-cutting patterns apply to multiple Phase 5 files. Planner should reference these from each plan's action section.

### Auth gate (server actions and admin RSC pages)

**Source:** `src/app/actions/grant-enrollment.ts:14-43` (also identical in `revoke-enrollment.ts:13-42`)
**Apply to:** all 5 new server actions (`upsert-institution`, `attach-institution-member`, `promote-institution-manager`, `detach-institution-member`, `search-students-for-institution`)

```typescript
async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) logger.error("Failed to load authenticated session on admin action", error.message);
  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessão expirada. Atualize a página e tente novamente." };
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Você não tem permissão para gerenciar acessos." };
  }
  return { supabase, user, errorMessage: null as string | null };
}
```

**Apply to:** all 4 new admin RSC pages (`/admin/instituicoes/page.tsx`, `nova/page.tsx`, `[slug]/page.tsx` — defense-in-depth even though middleware gates `/admin/*`):
```typescript
const supabase = await createSupabaseServerClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (error) logger.error("Failed to load authenticated session on /admin/instituicoes", error.message);
if (!user) {
  const search = new URLSearchParams({ redirectTo: "/admin/instituicoes" });
  redirect(`/login?${search.toString()}`);
}
const role = await fetchUserRole(supabase, user.id);
if (role !== "admin") redirect("/dashboard");
```

### Logger usage (server-only)

**Source:** `src/lib/logger.ts` + applied throughout (e.g., `src/app/actions/upsert-course.ts:121, 171, 203, 230, 258`)
**Apply to:** every server action and every query function

```typescript
import { logger } from "@/lib/logger";
// Always include error.message and a context object with table/ids:
logger.error("Falha ao [pt-BR action]", { table: "...", id: "...", error: error.message });
```

**Sentry capture for rare failures** (`upsert-course.ts` does NOT use captureException; `grant-enrollment.ts:80-82` does — use captureException for unexpected DB errors that should page on-call). Pattern from `grant-enrollment.ts`:
```typescript
captureException(new Error("Supabase upsert error (enrollments batch)"), {
  extra: { message: error.message, code: error.code },
});
```

### Status banner component pattern (inline)

**Source:** `src/app/admin/cursos/novo/new-course-form.tsx:168-180` and `src/app/admin/usuarios/user-manager.tsx:121-133`
**Apply to:** every form and every action result surface in `institution-manager.tsx`

```typescript
{state.message ? (
  <div role="status" aria-live="polite"
    className={`rounded-lg px-3 py-2 text-sm border ${
      state.success
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-red-200 bg-red-50 text-red-700"
    }`}>
    {state.message}
  </div>
) : null}
```

### Card surface

**Source:** Every admin card in the codebase (e.g., `src/app/admin/usuarios/user-manager.tsx:83`, `src/app/admin/cursos/page.tsx:111`, `src/app/dashboard/page.tsx:84`)
**Apply to:** every section block in Phase 5 admin and gestor pages

```typescript
<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
  <div className="mb-4 space-y-1">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Eyebrow</p>
    <h2 className="text-xl font-semibold text-slate-900">Heading</h2>
    <p className="text-sm text-slate-600">Subtitle.</p>
  </div>
  {/* content */}
</section>
```

### Primary CTA button

**Source:** `src/app/admin/cursos/page.tsx:84-89`
**Apply to:** all primary actions (Criar, Salvar, Adicionar, Convidar, Promover when no prior manager)

```typescript
<button type="submit" disabled={pending}
  className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
  {pending ? "Salvando..." : "Salvar"}
</button>
```

### Secondary / inverse button

**Source:** `src/app/admin/cursos/page.tsx:142-146`

```typescript
<Link href="..." className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
  Editar
</Link>
```

### Confirmation dialog wrap

**Source:** `src/components/admin/confirmation-dialog.tsx` (already exists — REUSE)
**Apply to:** promote (when prior manager exists), demote, detach actions

```typescript
<ConfirmationDialog
  open={dialogOpen}
  onClose={() => setDialogOpen(false)}
  title="..."
  body="..."
  confirmLabel="..."
  pendingLabel="..."
  onConfirm={handleConfirm}
  isPending={isPending}
/>
```

### useTransition + useActionState + Loader2 spinner pattern

**Source:** `src/components/admin/grant-enrollment-dialog.tsx:71-79, 337-345` and `src/app/admin/cursos/[slug]/alunos/revoke-enrollment-button.tsx:17-29`

```typescript
const [, startTransition] = useTransition();
const [state, formAction, isPending] = useActionState(action, initialState);

function handleClick() {
  const formData = new FormData();
  formData.set("...", "...");
  startTransition(() => { formAction(formData); });
}

// In render:
{isPending ? (
  <>
    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
    Promovendo…
  </>
) : (
  "Promover"
)}
```

### Test mock setup (Vitest)

**Source:** `src/app/actions/grant-enrollment.test.ts:1-46`
**Apply to:** all 5 new test files

Top-of-file `vi.mock` block — copy verbatim:
```typescript
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }) }));
vi.mock("@/lib/auth/roles", () => ({ fetchUserRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
```

### revalidatePath after admin mutation

**Source:** `src/app/actions/upsert-course.ts:82-87`
**Apply to:** every Phase 5 server action

```typescript
function revalidateInstitutionPages(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/instituicoes");
  if (slug) revalidatePath(`/admin/instituicoes/${slug}`);
  revalidatePath("/gestor");  // gestor dashboard for that manager
}
```

### Slug auto-fill on create form

**Source:** `src/app/admin/cursos/novo/new-course-form.tsx:33-43`
**Apply to:** `new-institution-form.tsx`

```typescript
const [titleValue, setTitleValue] = useState("");
const [slugTouched, setSlugTouched] = useState(false);
const slugRef = useRef<HTMLInputElement>(null);
const slugSuggestion = titleValue ? slugify(titleValue) : "";

useEffect(() => {
  if (!slugTouched && slugRef.current && slugSuggestion) {
    slugRef.current.value = slugSuggestion;
  }
}, [slugSuggestion, slugTouched]);

// In input: onChange={() => setSlugTouched(true)}
```

`slugify` import: `import { slugify } from "@/lib/courses/slugify";` — DO NOT duplicate in `src/lib/institutions/slugify.ts`.

### Postgres error code translation

**Source:** `src/app/actions/upsert-course.ts:67-80`
**Apply to:** every insert/update server action in Phase 5

```typescript
function formatSupabaseInsertOrUpdateError(error: { code?: string | null; message?: string | null }) {
  const permissionDenied = error.code === "42501" || (error.message ?? "").toLowerCase().includes("permission denied");
  const uniqueViolation = error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");
  if (permissionDenied) return "Voce nao tem permissao para salvar instituições (RLS).";
  if (uniqueViolation) return "Já existe uma instituição com este slug. Escolha outro slug.";
  return "Não foi possível salvar a instituição. Tente novamente.";
}
```

### Breadcrumb usage

**Source:** `src/components/admin/breadcrumb.tsx` (already exists — REUSE) + usage in `src/app/admin/cursos/novo/page.tsx:52-57`
**Apply to:** `/admin/instituicoes/nova/page.tsx` and `/admin/instituicoes/[slug]/page.tsx`

```typescript
<Breadcrumb items={[
  { label: "Instituições", href: "/admin/instituicoes" },
  { label: institution.name },  // last item, no href = current page
]} />
```

### Edge Function defensive profile upsert (Pitfall 6)

**Source:** RESEARCH §Common Pitfalls Pitfall 6 lines 687-707
**Apply to:** Edge Function institutional invite branch ONLY

```typescript
// After successful inviteUserByEmail:
if (newUserId) {
  await supabaseAdmin
    .from("profiles")
    .upsert(
      { id: newUserId, full_name: fullName, role: 'student' },
      { onConflict: "id", ignoreDuplicates: true },
    );
}
// Then insert into institution_members
```

**Why duplicated logic:** Deno Edge Function cannot import `src/lib/auth/profiles.ts:ensureProfileExists`. Reimplement defensively.

### RLS bypass justification block (D-12)

**Source:** RESEARCH Pattern 3 lines 422-436
**Apply to:** every function in `src/lib/institutions/queries.ts` that uses `createSupabaseAdminClient` server-side

```typescript
// BYPASS JUSTIFICATION (per CLAUDE.md and PROJECT.md Concerns):
// The "Students read own enrollments" RLS policy filters expires_at IS NULL OR > now().
// The manager dashboard MUST display expired enrollments per ENR-04 + D-12 (visibility
// is preserved as historical record). Rather than adding a new RLS policy that grants
// managers a broader read on enrollments, we use the admin client server-side and
// explicitly filter by institution_id (which is the intended scope). The admin client
// is server-only and the explicit filter mirrors the RLS authorization scope.
```

---

## No Analog Found

| File | Role | Data Flow | Reason | Recommended Approach |
|------|------|-----------|--------|----------------------|
| `src/app/gestor/progress-matrix.tsx` | RSC component (HTML matrix table) | request-response (read) | No existing per-row × per-col data matrix in repo | Copy table semantics from `src/app/admin/cursos/[slug]/alunos/page.tsx:193-258`, scope to `<thead><tr>` columns over courses + `<tbody><tr>` rows over students. UI-SPEC §Layout Matrix Table provides the literal JSX skeleton (lines 332-358) — use it verbatim. Sticky-first-column via `sticky left-0 z-10 bg-white` |
| `src/components/marketing/mdhe-contact-card.tsx` | dumb presentational | type definition | No reusable contact-card pattern in repo (institutional-leads form is the only marketing surface) | Copy spacing/typography from `src/app/admin/cursos/page.tsx:93-104` empty-state card. Use lucide `Mail` and `Phone` icons size 14 with `text-slate-400`. UI-SPEC §MDHE contact card provides the layout |
| `docs/email-templates.md` | docs | reference | No precedent — first email-templates doc | Plain Markdown. UI-SPEC §Copy + RESEARCH Example 4 provide Subject + HTML body. Title clearly: "TEMPLATE SOURCE OF TRUTH — copy/paste into Supabase Auth panel". Add to `docs/DEPLOY-CHECKLIST.md` as a one-time setup step |

---

## Metadata

**Analog search scope:**
- `src/app/admin/**/*.tsx` (16 files)
- `src/app/admin/usuarios/**` (4 files)
- `src/app/actions/*.ts` (24 files)
- `src/lib/courses/*.ts` (8 files)
- `src/components/admin/*.tsx` (6 files)
- `src/components/marketing/*` (none)
- `src/components/certificates/my-certificates.tsx` (1 file)
- `supabase/migrations/*.sql` (15 files)
- `supabase/functions/Criar-usuario/index.ts` (1 file)
- `middleware.ts` (1 file)
- `src/lib/admin/call-admin-user-function.ts` (1 file)
- `src/lib/auth/roles.ts` (1 file)

**Files scanned:** ~75
**Pattern extraction date:** 2026-05-02
**Analog quality:** 25 of 28 new/modified files have an "exact" or near-exact in-tree analog. Only `progress-matrix.tsx`, `mdhe-contact-card.tsx`, and `docs/email-templates.md` are net-new patterns — all three are well-defined by UI-SPEC §Layout and RESEARCH §Code Examples, so the planner has unambiguous scaffolds.
