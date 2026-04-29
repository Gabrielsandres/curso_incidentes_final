"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Users } from "lucide-react";

import {
  updateCourseAction,
  publishCourseAction,
  unpublishCourseAction,
  archiveCourseAction,
} from "@/app/actions/upsert-course";
import { initialCourseFormState, type CourseFormState } from "@/app/actions/course-form-state";
import { slugify } from "@/lib/courses/slugify";
import type { CourseRow } from "@/lib/courses/types";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-red-600">{errors[0]}</p>;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Salvando..." : "Salvar rascunho"}
    </button>
  );
}

export interface CourseEditFormProps {
  course: CourseRow;
  status: "rascunho" | "publicado" | "arquivado";
}

export function CourseEditForm({ course, status }: CourseEditFormProps) {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    updateCourseAction,
    initialCourseFormState,
  );
  const [titleValue, setTitleValue] = useState(course.title);
  const [slugTouched, setSlugTouched] = useState(false);
  const slugRef = useRef<HTMLInputElement>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isArchiving, startArchive] = useTransition();
  const [publishPending, startPublish] = useTransition();
  const [unpublishPending, startUnpublish] = useTransition();
  // Inline feedback for lifecycle mutations (publish/unpublish/archive).
  // Server actions return CourseFormState — capture the message + success flag
  // so the user gets explicit confirmation (BUG-04 from UAT — UX silenciosa).
  const [lifecycleFeedback, setLifecycleFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const slugSuggestion = titleValue ? slugify(titleValue) : "";

  useEffect(() => {
    if (!slugTouched && slugRef.current && slugSuggestion && slugSuggestion !== course.slug) {
      // Don't auto-update slug on edit page — it already has a value
    }
  }, [slugSuggestion, slugTouched, course.slug]);

  function handleArchiveConfirm() {
    startArchive(async () => {
      const fd = new FormData();
      fd.append("course_id", course.id);
      const result = await archiveCourseAction(initialCourseFormState, fd);
      setLifecycleFeedback({ success: result.success, message: result.message });
      setArchiveOpen(false);
    });
  }

  function handlePublish() {
    startPublish(async () => {
      const fd = new FormData();
      fd.append("course_id", course.id);
      const result = await publishCourseAction(initialCourseFormState, fd);
      setLifecycleFeedback({ success: result.success, message: result.message });
    });
  }

  function handleUnpublish() {
    startUnpublish(async () => {
      const fd = new FormData();
      fd.append("course_id", course.id);
      const result = await unpublishCourseAction(initialCourseFormState, fd);
      setLifecycleFeedback({ success: result.success, message: result.message });
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CURSO</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Detalhes do curso</h2>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="course_id" value={course.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Título *</span>
            <input
              type="text"
              name="title"
              required
              defaultValue={course.title}
              onChange={(e) => setTitleValue(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={state.fieldErrors?.title} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Slug *</span>
            <input
              ref={slugRef}
              type="text"
              name="slug"
              required
              defaultValue={course.slug}
              onChange={() => setSlugTouched(true)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <p className="text-xs text-slate-500">
              Use apenas letras minúsculas, números e hifens.{" "}
              <span className="italic">Ex.: gestao-de-incidentes-nivel-1</span>
            </p>
            {!slugTouched && slugSuggestion && slugSuggestion !== course.slug && (
              <p className="text-xs italic text-slate-400">Sugestão: {slugSuggestion}</p>
            )}
            <FieldError errors={state.fieldErrors?.slug} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descrição</span>
          <textarea
            name="description"
            defaultValue={course.description ?? ""}
            className="min-h-[84px] w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={state.fieldErrors?.description} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">URL da capa</span>
          <input
            type="text"
            name="cover_image_url"
            defaultValue={course.cover_image_url ?? ""}
            placeholder="https://... ou /capa_curso.png"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-xs text-slate-500">Deixe em branco para usar a capa padrão.</p>
          <FieldError errors={state.fieldErrors?.coverImageUrl} />
        </label>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CERTIFICADO</p>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              name="certificate_enabled"
              defaultChecked={course.certificate_enabled}
              className="h-4 w-4 rounded border-slate-300"
            />
            Emitir certificado neste curso
          </label>
          <FieldError errors={state.fieldErrors?.certificateEnabled} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Template do certificado</span>
              <input
                type="text"
                name="certificate_template_url"
                defaultValue={course.certificate_template_url ?? ""}
                placeholder="/certificado_teste.png ou https://..."
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={state.fieldErrors?.certificateTemplateUrl} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Carga horária (horas)</span>
              <input
                type="number"
                name="certificate_workload_hours"
                min={1}
                step={1}
                defaultValue={course.certificate_workload_hours ?? ""}
                placeholder="60"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={state.fieldErrors?.certificateWorkloadHours} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Nome da assinatura</span>
              <input
                type="text"
                name="certificate_signer_name"
                defaultValue={course.certificate_signer_name ?? ""}
                placeholder="Nome do responsável"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={state.fieldErrors?.certificateSignerName} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Cargo da assinatura</span>
              <input
                type="text"
                name="certificate_signer_role"
                defaultValue={course.certificate_signer_role ?? ""}
                placeholder="Ex.: Coordenação Pedagógica"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={state.fieldErrors?.certificateSignerRole} />
            </label>
          </div>
        </section>

        {state.message ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg px-3 py-2 text-sm border ${
              state.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {state.message}
          </div>
        ) : null}

        {lifecycleFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className={`rounded-lg px-3 py-2 text-sm border ${
              lifecycleFeedback.success
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {lifecycleFeedback.message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton />

          {status === "rascunho" && (
            <button
              type="button"
              disabled={publishPending}
              onClick={handlePublish}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {publishPending ? "Publicando..." : "Publicar curso"}
            </button>
          )}

          {status === "publicado" && (
            <button
              type="button"
              disabled={unpublishPending}
              onClick={handleUnpublish}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              {unpublishPending ? "Despublicando..." : "Despublicar curso"}
            </button>
          )}

          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Arquivar curso
          </button>

          <Link
            href={`/admin/cursos/${course.slug}/alunos`}
            className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <Users size={16} aria-hidden="true" />
            Alunos com acesso
          </Link>
        </div>
      </form>

      <ConfirmationDialog
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title="Arquivar este curso?"
        body="O curso será removido da listagem dos alunos. Certificados e histórico de progresso já emitidos são preservados. Esta ação pode ser revertida via suporte."
        confirmLabel="Arquivar curso"
        onConfirm={handleArchiveConfirm}
        isPending={isArchiving}
      />
    </section>
  );
}
