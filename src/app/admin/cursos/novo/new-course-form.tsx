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
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Salvando..." : "Salvar rascunho"}
    </button>
  );
}

export function NewCourseForm() {
  const [state, formAction] = useActionState<CourseFormState, FormData>(
    createCourseAction,
    initialCourseFormState,
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CURSO</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Detalhes do curso</h2>

      <form action={formAction} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Título *</span>
            <input
              type="text"
              name="title"
              required
              placeholder="Ex.: Gestão de Incidentes — Nível 1"
              value={titleValue}
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
              placeholder="gestao-de-incidentes"
              onChange={() => setSlugTouched(true)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <p className="text-xs text-slate-500">
              Use apenas letras minúsculas, números e hifens.
            </p>
            {!slugTouched && slugSuggestion && (
              <p className="text-xs italic text-slate-400">Sugestão: {slugSuggestion}</p>
            )}
            <FieldError errors={state.fieldErrors?.slug} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descrição</span>
          <textarea
            name="description"
            placeholder="Resumo do curso (opcional)"
            className="min-h-[84px] w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={state.fieldErrors?.description} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">URL da capa</span>
          <input
            type="text"
            name="cover_image_url"
            placeholder="https://... ou /capa_curso.png"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-xs text-slate-500">Se vazio, o sistema usa a capa padrão automaticamente.</p>
          <FieldError errors={state.fieldErrors?.coverImageUrl} />
        </label>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CERTIFICADO</p>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="certificate_enabled" className="h-4 w-4 rounded border-slate-300" />
            Emitir certificado neste curso
          </label>
          <FieldError errors={state.fieldErrors?.certificateEnabled} />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Template do certificado</span>
              <input
                type="text"
                name="certificate_template_url"
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

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
