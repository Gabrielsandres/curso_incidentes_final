"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createLessonAction, type CreateLessonFormState } from "@/app/actions/create-lesson";

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
}: {
  moduleId: string;
  courseSlug: string;
}) {
  const [open, setOpen] = useState(false);
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
