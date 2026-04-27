"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { initialCourseFormState, type CourseFormState } from "@/app/actions/course-form-state";
import { createCourseAction, updateCourseAction } from "@/app/actions/upsert-course";
import { resolveCourseCoverUrl } from "@/lib/courses/covers";
import type { CourseRow } from "@/lib/courses/types";

type AdminCourse = Pick<
  CourseRow,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "cover_image_url"
  | "certificate_enabled"
  | "certificate_template_url"
  | "certificate_workload_hours"
  | "certificate_signer_name"
  | "certificate_signer_role"
  | "created_at"
>;

type CourseManagerProps = {
  courses: AdminCourse[];
};

export function CourseManager({ courses }: CourseManagerProps) {
  const router = useRouter();
  const createFormRef = useRef<HTMLFormElement>(null);
  const refreshedAfterCreateRef = useRef(false);
  const [createState, createFormAction] = useActionState<CourseFormState, FormData>(createCourseAction, initialCourseFormState);

  useEffect(() => {
    if (!createState.success) {
      refreshedAfterCreateRef.current = false;
      return;
    }

    createFormRef.current?.reset();

    if (!refreshedAfterCreateRef.current) {
      refreshedAfterCreateRef.current = true;
      router.refresh();
    }
  }, [createState.success, router]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cursos</p>
          <h2 className="text-xl font-semibold text-slate-900">Cadastrar novo curso</h2>
          <p className="text-sm text-slate-600">
            Informe o slug, titulo e (opcionalmente) a URL da capa. Se nenhuma capa for definida, o frontend usa
            automaticamente a imagem padrao `capa_curso`.
          </p>
        </div>

        <form ref={createFormRef} action={createFormAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Titulo *</span>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex.: Gestao de Incidentes - Nivel 1"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={createState.fieldErrors?.title} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Slug *</span>
              <input
                type="text"
                name="slug"
                required
                placeholder="gestao-de-incidentes"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={createState.fieldErrors?.slug} />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Descricao</span>
            <textarea
              name="description"
              placeholder="Resumo do curso (opcional)"
              className="min-h-[84px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={createState.fieldErrors?.description} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">URL da capa</span>
            <input
              type="text"
              name="cover_image_url"
              placeholder="https://... ou /capa_curso.png"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={createState.fieldErrors?.coverImageUrl} />
            <p className="text-xs text-slate-500">Se vazio, o sistema usa `/capa_curso.png` automaticamente.</p>
          </label>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" name="certificate_enabled" className="h-4 w-4 rounded border-slate-300" />
              Emitir certificado neste curso
            </label>
            <FieldError errors={createState.fieldErrors?.certificateEnabled} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Template do certificado</span>
                <input
                  type="text"
                  name="certificate_template_url"
                  placeholder="/certificado_teste.png ou https://..."
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createState.fieldErrors?.certificateTemplateUrl} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Carga horaria (horas)</span>
                <input
                  type="number"
                  name="certificate_workload_hours"
                  min={1}
                  step={1}
                  placeholder="60"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createState.fieldErrors?.certificateWorkloadHours} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Nome da assinatura</span>
                <input
                  type="text"
                  name="certificate_signer_name"
                  placeholder="Nome do responsavel"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createState.fieldErrors?.certificateSignerName} />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Cargo da assinatura</span>
                <input
                  type="text"
                  name="certificate_signer_role"
                  placeholder="Ex.: Coordenacao Pedagogica"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <FieldError errors={createState.fieldErrors?.certificateSignerRole} />
              </label>
            </div>
          </section>

          {createState.message ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                createState.success
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {createState.message}
            </div>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton label="Criar curso" pendingLabel="Criando..." />
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Edicao</p>
          <h2 className="text-xl font-semibold text-slate-900">Cursos cadastrados</h2>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Nenhum curso cadastrado ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {courses.map((course) => (
              <CourseEditCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CourseEditCard({ course }: { course: AdminCourse }) {
  const [state, formAction] = useActionState<CourseFormState, FormData>(updateCourseAction, initialCourseFormState);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,220px),minmax(0,1fr)]">
        <div
          className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.9), rgba(15,23,42,0.15)), url('${resolveCourseCoverUrl(
              course.cover_image_url,
            )}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="flex min-h-28 items-end p-3">
            <p className="text-sm font-semibold text-white">{course.title}</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-500">Slug</p>
          <p className="text-sm font-medium text-slate-900">{course.slug}</p>
          <p className="text-xs text-slate-500">Criado em {new Date(course.created_at).toLocaleString("pt-BR")}</p>
          {course.description ? <p className="text-sm text-slate-600">{course.description}</p> : null}
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="course_id" value={course.id} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Titulo *</span>
            <input
              type="text"
              name="title"
              required
              defaultValue={course.title}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={state.fieldErrors?.title} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Slug *</span>
            <input
              type="text"
              name="slug"
              required
              defaultValue={course.slug}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={state.fieldErrors?.slug} />
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Descricao</span>
          <textarea
            name="description"
            defaultValue={course.description ?? ""}
            className="min-h-[84px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
          <FieldError errors={state.fieldErrors?.coverImageUrl} />
          <p className="text-xs text-slate-500">Deixe em branco para usar a capa padrao do repositorio.</p>
        </label>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
              <span className="text-sm font-medium text-slate-700">Carga horaria (horas)</span>
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
                placeholder="Nome do responsavel"
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
                placeholder="Ex.: Coordenacao Pedagogica"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={state.fieldErrors?.certificateSignerRole} />
            </label>
          </div>
        </section>

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

        <div className="flex justify-end">
          <SubmitButton label="Salvar curso" pendingLabel="Salvando..." />
        </div>
      </form>
    </article>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
