"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createLessonAction } from "@/app/actions/create-lesson";
import type { CreateLessonFormState } from "@/app/actions/create-lesson-state";

const initialState: CreateLessonFormState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Adicionando..." : "Adicionar aula"}
    </button>
  );
}

export function AddLessonForm({
  moduleId,
  courseSlug,
  isProduction,
}: {
  moduleId: string;
  courseSlug: string;
  isProduction: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Controlled state is required here (not uncontrolled/defaultValue) because the video_external_id
  // input placeholder must change dynamically when the user switches provider. An uncontrolled select
  // cannot drive a dependent placeholder update — the controlled value is the source of truth for
  // the conditional placeholder expression. (PATTERNS.md prescribes defaultValue for simpler selects,
  // but this is a documented deviation for the dynamic-placeholder use case per UI-SPEC.)
  const [provider, setProvider] = useState<"bunny" | "youtube">("bunny");
  const [state, formAction] = useActionState<CreateLessonFormState, FormData>(
    createLessonAction,
    initialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        Adicionar aula
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-sm font-medium text-slate-700">Nova aula</p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="module_id" value={moduleId} />
        <input type="hidden" name="course_slug" value={courseSlug} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">Título *</span>
          <input
            type="text"
            name="title"
            required
            autoFocus
            placeholder="Ex.: Introdução ao módulo"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          {state.fieldErrors?.title && (
            <p className="text-xs text-red-600">{state.fieldErrors.title[0]}</p>
          )}
        </label>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            VÍDEO
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-700">Plataforma</span>
            <select
              name="video_provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value as "bunny" | "youtube")}
              className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option value="bunny">Bunny Stream</option>
              {!isProduction && (
                <option value="youtube">YouTube (apenas dev)</option>
              )}
            </select>
            <p className="text-xs text-slate-500">
              Em produção, use Bunny Stream. YouTube é apenas para desenvolvimento.
            </p>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-700">ID do vídeo</span>
            <input
              type="text"
              name="video_external_id"
              placeholder={
                provider === "bunny"
                  ? "GUID do vídeo no Bunny Stream (ex.: a1b2c3d4-...)"
                  : "ID do vídeo do YouTube (ex.: dQw4w9WgXcQ)"
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {state.fieldErrors?.videoExternalId && (
              <p className="text-xs text-red-600">{state.fieldErrors.videoExternalId[0]}</p>
            )}
          </label>
        </section>

        {state.message && (
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
        )}

        <div className="flex items-center gap-2">
          <SubmitButton />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
