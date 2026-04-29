"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { updateLessonAction, deleteLessonAction } from "@/app/actions/update-lesson";
import type { LessonFormState } from "@/app/actions/lesson-form-state";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import type { LessonRow } from "@/lib/courses/types";

const initialState: LessonFormState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Salvando..." : "Salvar aula"}
    </button>
  );
}

export function LessonEditForm({
  lesson,
  isProduction,
}: {
  lesson: LessonRow;
  isProduction: boolean;
}) {
  const [state, formAction] = useActionState<LessonFormState, FormData>(
    updateLessonAction,
    initialState,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDeleteConfirm() {
    startDelete(async () => {
      const fd = new FormData();
      fd.append("lesson_id", lesson.id);
      await deleteLessonAction({ success: false, message: "" }, fd);
      setDeleteOpen(false);
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">AULA</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Detalhes da aula</h2>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="lesson_id" value={lesson.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Título *</span>
            <input
              type="text"
              name="title"
              required
              defaultValue={lesson.title}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {state.fieldErrors?.title && (
              <p className="text-xs text-red-600">{state.fieldErrors.title[0]}</p>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Duração estimada (minutos)</span>
            <input
              type="number"
              name="workload_minutes"
              min={1}
              defaultValue={lesson.workload_minutes ?? ""}
              placeholder="Ex.: 45"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {state.fieldErrors?.workloadMinutes && (
              <p className="text-xs text-red-600">{state.fieldErrors.workloadMinutes[0]}</p>
            )}
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descrição</span>
          <textarea
            name="description"
            defaultValue={lesson.description ?? ""}
            className="min-h-[84px] w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          {state.fieldErrors?.description && (
            <p className="text-xs text-red-600">{state.fieldErrors.description[0]}</p>
          )}
        </label>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            CONFIGURAÇÃO DE VÍDEO
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Plataforma de vídeo</span>
            <div className="relative">
              <select
                name="video_provider"
                defaultValue={lesson.video_provider ?? "bunny"}
                className="w-full appearance-none rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="bunny">Bunny Stream</option>
                {!isProduction && (
                  <option value="youtube">YouTube (apenas dev)</option>
                )}
              </select>
            </div>
            <p className="text-xs text-slate-500">
              Em produção, use Bunny Stream. YouTube é apenas para desenvolvimento.
            </p>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">ID do vídeo</span>
            <input
              type="text"
              name="video_external_id"
              defaultValue={lesson.video_external_id ?? ""}
              placeholder="ID do vídeo no provider selecionado"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            {state.fieldErrors?.videoExternalId && (
              <p className="text-xs text-red-600">{state.fieldErrors.videoExternalId[0]}</p>
            )}
          </label>
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

        <div className="flex items-center gap-3">
          <SubmitButton />
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Remover aula
          </button>
        </div>
      </form>

      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover esta aula?"
        body="A aula será arquivada. O histórico de progresso dos alunos que já a assistiram é preservado."
        confirmLabel="Remover aula"
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </section>
  );
}
