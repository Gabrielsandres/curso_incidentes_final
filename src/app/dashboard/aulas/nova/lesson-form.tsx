"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { createLessonAction, type CreateLessonFormState } from "@/app/actions/create-lesson";
import type { ModuleForLessonOption } from "@/lib/courses/types";

type CreateLessonFormProps = {
  modules: ModuleForLessonOption[];
};

const initialCreateLessonState: CreateLessonFormState = {
  success: false,
  message: "",
};

export function CreateLessonForm({ modules }: CreateLessonFormProps) {
  const [state, formAction] = useActionState<CreateLessonFormState>(
    createLessonAction,
    initialCreateLessonState,
  );
  const hasModules = modules.length > 0;

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Formulário</p>
        <h2 className="text-xl font-semibold text-slate-900">Dados da aula</h2>
        <p className="text-sm text-slate-600">
          Selecione o módulo e preencha as informações obrigatórias. Título, link do vídeo e posição são campos
          obrigatórios.
        </p>
      </div>

      {!hasModules ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Nenhum módulo cadastrado. Crie um módulo antes de adicionar aulas.
        </div>
      ) : null}

      {state.message ? (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            state.success
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Módulo *</span>
          <select
            name="module_id"
            required
            defaultValue=""
            disabled={!hasModules}
            className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="" disabled>
              Selecione um módulo
            </option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.courseTitle} · {module.title} (pos. {module.position})
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.moduleId} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Posição *</span>
          <input
            type="number"
            name="position"
            min={1}
            defaultValue={1}
            required
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={state.fieldErrors?.position} />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Título *</span>
        <input
          type="text"
          name="title"
          required
          placeholder="Ex.: Procedimentos iniciais"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <FieldError errors={state.fieldErrors?.title} />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Descrição</span>
        <textarea
          name="description"
          placeholder="Contexto ou objetivos desta aula (opcional)"
          className="min-h-[96px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <FieldError errors={state.fieldErrors?.description} />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">URL do vídeo *</span>
        <input
          type="url"
          name="video_url"
          required
          placeholder="https://youtube.com/..."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
        <FieldError errors={state.fieldErrors?.videoUrl} />
      </label>

      <div className="flex items-center justify-end">
        <SubmitButton disabled={!hasModules} />
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Salvando..." : "Salvar aula"}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
