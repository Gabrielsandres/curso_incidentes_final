"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createLessonAction, type CreateLessonFormState } from "@/app/actions/create-lesson";
import {
  createModuleAction,
  type CreateModuleFormState,
} from "@/app/actions/create-module";
import type { CourseSummary, ModuleForLessonOption } from "@/lib/courses/types";

type CreateLessonFormProps = {
  modules: ModuleForLessonOption[];
  courses: CourseSummary[];
  openCreateModuleOnLoad?: boolean;
  askToCreateLessonAfterModule?: boolean;
};

const initialCreateLessonState: CreateLessonFormState = {
  success: false,
  message: "",
};

const initialCreateModuleState: CreateModuleFormState = {
  success: false,
  message: "",
};

function sortModuleOptions(options: ModuleForLessonOption[]) {
  return [...options].sort((left, right) => {
    const courseOrder = left.courseTitle.localeCompare(right.courseTitle, "pt-BR");
    if (courseOrder !== 0) {
      return courseOrder;
    }

    if (left.position !== right.position) {
      return left.position - right.position;
    }

    return left.title.localeCompare(right.title, "pt-BR");
  });
}

export function CreateLessonForm({
  modules,
  courses,
  openCreateModuleOnLoad = false,
  askToCreateLessonAfterModule = false,
}: CreateLessonFormProps) {
  const [moduleOptions, setModuleOptions] = useState<ModuleForLessonOption[]>(() => sortModuleOptions(modules));
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(openCreateModuleOnLoad);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const createModuleFormRef = useRef<HTMLFormElement>(null);
  const hasModules = moduleOptions.length > 0;
  const [lessonState, lessonFormAction] = useActionState<CreateLessonFormState, FormData>(
    createLessonAction,
    initialCreateLessonState,
  );
  const [createModuleState, createModuleFormAction] = useActionState<CreateModuleFormState, FormData>(
    async (previousState, formData) => {
      const result = await createModuleAction(previousState, formData);
      const createdOption = result.moduleOption;

      if (result.success && createdOption) {
        createModuleFormRef.current?.reset();
        setIsCreateModuleModalOpen(false);
        setSelectedModuleId(createdOption.id);
        setModuleOptions((previous) => {
          const moduleMap = new Map(previous.map((moduleOption) => [moduleOption.id, moduleOption]));
          moduleMap.set(createdOption.id, createdOption);
          return sortModuleOptions(Array.from(moduleMap.values()));
        });

        if (askToCreateLessonAfterModule) {
          const shouldCreateLesson = window.confirm("Módulo criado com sucesso. Deseja criar uma aula agora?");
          if (shouldCreateLesson) {
            titleInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            titleInputRef.current?.focus();
          }
        }
      }

      return result;
    },
    initialCreateModuleState,
  );

  const selectedModule = useMemo(
    () => moduleOptions.find((moduleOption) => moduleOption.id === selectedModuleId) ?? null,
    [moduleOptions, selectedModuleId],
  );

  const resolvedCourse = useMemo(() => {
    if (selectedModule) {
      return courses.find((course) => course.id === selectedModule.courseId) ?? null;
    }

    if (moduleOptions.length > 0) {
      return courses.find((course) => course.id === moduleOptions[0].courseId) ?? null;
    }

    return courses[0] ?? null;
  }, [selectedModule, moduleOptions, courses]);

  return (
    <>
      <form action={lessonFormAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            Nenhum módulo cadastrado. Use a opção <strong>+ Criar novo módulo</strong> para começar.
          </div>
        ) : null}

        {lessonState.message ? (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              lessonState.success
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {lessonState.message}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Selecionar módulo *</span>
            <select
              name="module_id"
              required
              value={selectedModuleId}
              disabled={!hasModules}
              onChange={(event) => setSelectedModuleId(event.target.value)}
              className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="" disabled>
                Selecione um módulo
              </option>
              {moduleOptions.map((moduleOption) => (
                <option key={moduleOption.id} value={moduleOption.id}>
                  {moduleOption.title}
                </option>
              ))}
            </select>
            <FieldError errors={lessonState.fieldErrors?.moduleId} />

            <button
              type="button"
              onClick={() => setIsCreateModuleModalOpen(true)}
              className="w-fit text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              + Criar novo módulo
            </button>
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
            <FieldError errors={lessonState.fieldErrors?.position} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Título *</span>
          <input
            ref={titleInputRef}
            id="lesson-title-input"
            type="text"
            name="title"
            required
            placeholder="Ex.: Procedimentos iniciais"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={lessonState.fieldErrors?.title} />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descrição</span>
          <textarea
            name="description"
            placeholder="Contexto ou objetivos desta aula (opcional)"
            className="min-h-[96px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
          <FieldError errors={lessonState.fieldErrors?.description} />
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
          <FieldError errors={lessonState.fieldErrors?.videoUrl} />
        </label>

        <div className="flex items-center justify-end">
          <SubmitLessonButton disabled={!hasModules || selectedModuleId.length === 0} />
        </div>
      </form>

      {isCreateModuleModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Módulo</p>
              <h3 className="text-xl font-semibold text-slate-900">Criar novo módulo</h3>
            </div>

            <form ref={createModuleFormRef} action={createModuleFormAction} className="space-y-4">
              <input type="hidden" name="course_id" value={resolvedCourse?.id ?? ""} />

              {resolvedCourse ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Curso de destino: <strong>{resolvedCourse.title}</strong>
                </p>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Nenhum curso encontrado para vincular o módulo. Cadastre um curso antes de continuar.
                </p>
              )}

              {createModuleState.message ? (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    createModuleState.success
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {createModuleState.message}
                </div>
              ) : null}

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Nome do módulo *</span>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="Ex.: Módulo 4 - Gestão avançada"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createModuleState.fieldErrors?.title} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Descrição (opcional)</span>
                <textarea
                  name="description"
                  placeholder="Resumo do conteúdo do módulo"
                  className="min-h-[90px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createModuleState.fieldErrors?.description} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Ordem (opcional)</span>
                <input
                  type="number"
                  name="position"
                  min={1}
                  placeholder="Ex.: 4"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createModuleState.fieldErrors?.position} />
                <FieldError errors={createModuleState.fieldErrors?.courseId} />
              </label>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModuleModalOpen(false)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <SubmitCreateModuleButton disabled={!resolvedCourse} />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SubmitLessonButton({ disabled }: { disabled: boolean }) {
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

function SubmitCreateModuleButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Criando..." : "Criar módulo"}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
