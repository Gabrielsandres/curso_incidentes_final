"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { updateModuleAction, deleteModuleAction, type ModuleFormState } from "@/app/actions/update-module";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import type { ModuleRow } from "@/lib/courses/types";

const initialState: ModuleFormState = { success: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {pending ? "Salvando..." : "Salvar módulo"}
    </button>
  );
}

export function ModuleEditForm({
  module,
  courseSlug,
}: {
  module: ModuleRow;
  courseSlug: string;
}) {
  const [state, formAction] = useActionState<ModuleFormState, FormData>(
    updateModuleAction,
    initialState,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDelete] = useTransition();

  function handleDeleteConfirm() {
    startDelete(async () => {
      const fd = new FormData();
      fd.append("module_id", module.id);
      fd.append("course_slug", courseSlug);
      await deleteModuleAction({ success: false, message: "" }, fd);
      setDeleteOpen(false);
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">MÓDULO</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">Detalhes do módulo</h2>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="module_id" value={module.id} />
        <input type="hidden" name="course_slug" value={courseSlug} />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Título *</span>
          <input
            type="text"
            name="title"
            required
            defaultValue={module.title}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          {state.fieldErrors?.title && (
            <p className="text-xs text-red-600">{state.fieldErrors.title[0]}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descrição</span>
          <textarea
            name="description"
            defaultValue={module.description ?? ""}
            className="min-h-[84px] w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          {state.fieldErrors?.description && (
            <p className="text-xs text-red-600">{state.fieldErrors.description[0]}</p>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Posição</span>
          <input
            type="number"
            readOnly
            value={module.position}
            className="w-24 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed outline-none"
          />
          <p className="text-xs text-slate-500">Reordenação via ↑/↓ na lista de módulos.</p>
        </label>

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
            Remover módulo
          </button>
        </div>
      </form>

      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover este módulo?"
        body="Todas as aulas do módulo serão arquivadas. O histórico de progresso dos alunos é preservado. Use Restaurar aula se precisar desfazer."
        confirmLabel="Remover módulo"
        onConfirm={handleDeleteConfirm}
        isPending={isDeleting}
      />
    </section>
  );
}
