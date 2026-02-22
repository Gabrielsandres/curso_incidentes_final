"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { createLessonAction, type CreateLessonFormState } from "@/app/actions/create-lesson";
import {
  createModuleAction,
  type CreateModuleFormState,
} from "@/app/actions/create-module";
import type { CourseSummary, ModuleForLessonOption } from "@/lib/courses/types";
import { ALLOWED_MATERIAL_EXTENSIONS, MAX_MATERIAL_FILE_SIZE_BYTES } from "@/lib/materials/storage";

type CreateLessonFormProps = {
  modules: ModuleForLessonOption[];
  courses: CourseSummary[];
  openCreateModuleOnLoad?: boolean;
  askToCreateLessonAfterModule?: boolean;
};

type UploadedMaterialMetadata = {
  bucket: string;
  path: string;
  mimeType: string | null;
  sizeBytes: number;
  originalFileName: string;
};

type MaterialUploadStatus = "idle" | "uploading" | "uploaded" | "error";

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
  const [materialSource, setMaterialSource] = useState<"LINK" | "UPLOAD">("LINK");
  const [selectedMaterialFileName, setSelectedMaterialFileName] = useState<string | null>(null);
  const [materialFileClientError, setMaterialFileClientError] = useState<string | null>(null);
  const [materialUploadStatus, setMaterialUploadStatus] = useState<MaterialUploadStatus>("idle");
  const [materialUploadMessage, setMaterialUploadMessage] = useState<string | null>(null);
  const [uploadedMaterialMetadata, setUploadedMaterialMetadata] = useState<UploadedMaterialMetadata | null>(null);
  const [draftLessonId, setDraftLessonId] = useState("");
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(openCreateModuleOnLoad);
  const lessonFormRef = useRef<HTMLFormElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const materialFileInputRef = useRef<HTMLInputElement>(null);
  const createModuleFormRef = useRef<HTMLFormElement>(null);
  const allowNextSubmitRef = useRef(false);
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

  function resetUploadedMaterialState() {
    setUploadedMaterialMetadata(null);
    setMaterialUploadStatus("idle");
    setMaterialUploadMessage(null);
    setDraftLessonId("");
    setSelectedMaterialFileName(null);
    setMaterialFileClientError(null);
    if (materialFileInputRef.current) {
      materialFileInputRef.current.value = "";
    }
  }

  async function uploadMaterialBeforeSubmit() {
    if (materialSource !== "UPLOAD") {
      return true;
    }

    if (materialFileClientError) {
      setMaterialUploadStatus("error");
      setMaterialUploadMessage(materialFileClientError);
      return false;
    }

    const file = materialFileInputRef.current?.files?.[0] ?? null;
    if (!file) {
      setMaterialUploadStatus("error");
      setMaterialUploadMessage("Selecione um arquivo para enviar o anexo.");
      return false;
    }

    if (!selectedModuleId) {
      setMaterialUploadStatus("error");
      setMaterialUploadMessage("Selecione um modulo antes de enviar o anexo.");
      return false;
    }

    const nextDraftLessonId = draftLessonId || globalThis.crypto?.randomUUID?.() || "";
    if (!nextDraftLessonId) {
      setMaterialUploadStatus("error");
      setMaterialUploadMessage("Nao foi possivel gerar identificador temporario da aula.");
      return false;
    }

    setDraftLessonId(nextDraftLessonId);
    setMaterialUploadStatus("uploading");
    setMaterialUploadMessage("Enviando anexo...");

    try {
      const uploadFormData = new FormData();
      uploadFormData.set("lessonId", nextDraftLessonId);
      uploadFormData.set("moduleId", selectedModuleId);
      uploadFormData.set("file", file);

      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const body = (await response.json().catch(() => null)) as
        | { metadata?: UploadedMaterialMetadata; message?: string }
        | null;

      if (!response.ok || !body?.metadata) {
        throw new Error(body?.message || "Nao foi possivel enviar o anexo.");
      }

      setUploadedMaterialMetadata(body.metadata);
      setMaterialUploadStatus("uploaded");
      setMaterialUploadMessage(`Anexo enviado: ${body.metadata.originalFileName}`);
      return true;
    } catch (error) {
      setUploadedMaterialMetadata(null);
      setMaterialUploadStatus("error");
      setMaterialUploadMessage(error instanceof Error ? error.message : "Falha ao enviar anexo.");
      return false;
    }
  }

  async function handleLessonFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (allowNextSubmitRef.current) {
      allowNextSubmitRef.current = false;
      return;
    }

    if (materialSource !== "UPLOAD") {
      return;
    }

    const file = materialFileInputRef.current?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (uploadedMaterialMetadata) {
      return;
    }

    event.preventDefault();
    const uploadOk = await uploadMaterialBeforeSubmit();
    if (!uploadOk) {
      return;
    }

    allowNextSubmitRef.current = true;
    const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeSubmitEvent.submitter;

    if (submitter instanceof HTMLElement) {
      lessonFormRef.current?.requestSubmit(submitter as HTMLButtonElement);
      return;
    }

    lessonFormRef.current?.requestSubmit();
  }

  function handleMaterialFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadedMaterialMetadata(null);
    setDraftLessonId("");
    setMaterialUploadStatus("idle");
    setMaterialUploadMessage(null);

    if (!file) {
      setSelectedMaterialFileName(null);
      setMaterialFileClientError(null);
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_MATERIAL_EXTENSIONS.has(extension)) {
      setSelectedMaterialFileName(file.name);
      setMaterialFileClientError("Tipo de arquivo nao permitido. Use PDF, Office, ZIP, PNG ou JPG.");
      return;
    }

    if (file.size > MAX_MATERIAL_FILE_SIZE_BYTES) {
      setSelectedMaterialFileName(file.name);
      setMaterialFileClientError("Arquivo acima de 20MB. Selecione um arquivo menor.");
      return;
    }

    setSelectedMaterialFileName(file.name);
    setMaterialFileClientError(null);
  }

  return (
    <>
      <form
        ref={lessonFormRef}
        action={lessonFormAction}
        onSubmit={handleLessonFormSubmit}
        encType="multipart/form-data"
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
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
              onChange={(event) => {
                setSelectedModuleId(event.target.value);
                resetUploadedMaterialState();
              }}
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

        <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Material complementar</p>
            <h3 className="text-base font-semibold text-slate-900">Opcional</h3>
            <p className="text-sm text-slate-600">
              PDF, link, arquivo ou outro recurso. Se preencher algum campo, informe pelo menos o titulo; para origem
              em link, informe URL, e para anexo envie um arquivo valido.
            </p>
          </div>

          <input type="hidden" name="material_source" value={materialSource} />
          <input type="hidden" name="material_has_file" value={selectedMaterialFileName ? "true" : "false"} />
          <input type="hidden" name="draft_lesson_id" value={draftLessonId} />
          <input type="hidden" name="uploaded_material_bucket" value={uploadedMaterialMetadata?.bucket ?? ""} />
          <input type="hidden" name="uploaded_material_path" value={uploadedMaterialMetadata?.path ?? ""} />
          <input type="hidden" name="uploaded_material_mime_type" value={uploadedMaterialMetadata?.mimeType ?? ""} />
          <input type="hidden" name="uploaded_material_size_bytes" value={uploadedMaterialMetadata?.sizeBytes ?? ""} />
          <input
            type="hidden"
            name="uploaded_material_original_file_name"
            value={uploadedMaterialMetadata?.originalFileName ?? ""}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMaterialSource("LINK");
                resetUploadedMaterialState();
                setMaterialFileClientError(null);
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                materialSource === "LINK"
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold">Link externo</p>
              <p className="mt-1 text-xs text-slate-500">Use uma URL de PDF, drive, site ou outro recurso.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setMaterialSource("UPLOAD");
                resetUploadedMaterialState();
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                materialSource === "UPLOAD"
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-semibold">Enviar anexo</p>
              <p className="mt-1 text-xs text-slate-500">Upload para armazenamento privado (link assinado).</p>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Tipo do material</span>
              <select
                name="material_type"
                defaultValue=""
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">Selecione (opcional)</option>
                <option value="PDF">PDF</option>
                <option value="LINK">Link</option>
                <option value="ARQUIVO">Arquivo</option>
                <option value="OUTRO">Outro</option>
              </select>
              <FieldError errors={lessonState.fieldErrors?.materialType} />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Titulo do material</span>
              <input
                type="text"
                name="material_label"
                placeholder="Ex.: Checklist da aula"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
              <FieldError errors={lessonState.fieldErrors?.materialLabel} />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Descricao do material</span>
            <textarea
              name="material_description"
              placeholder="Explique rapidamente para que serve este recurso (opcional)"
              className="min-h-[80px] w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={lessonState.fieldErrors?.materialDescription} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">URL do material</span>
            <input
              type="url"
              name="material_url"
              disabled={materialSource !== "LINK"}
              placeholder="https://..."
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
            <FieldError errors={lessonState.fieldErrors?.materialUrl} />
          </label>

          {materialSource === "UPLOAD" ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Arquivo do material</span>
              <input
                ref={materialFileInputRef}
                type="file"
                name="material_file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
                onChange={handleMaterialFileChange}
                className="block w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
              />
              <p className="text-xs text-slate-500">
                Tipos permitidos: PDF, Office, ZIP, PNG, JPG. Tamanho maximo: 20MB.
              </p>
              {selectedMaterialFileName ? <p className="text-xs text-slate-600">Selecionado: {selectedMaterialFileName}</p> : null}
              {materialUploadStatus !== "idle" && materialUploadMessage ? (
                <p
                  className={`text-xs ${
                    materialUploadStatus === "uploaded"
                      ? "text-emerald-600"
                      : materialUploadStatus === "uploading"
                        ? "text-sky-700"
                        : "text-red-600"
                  }`}
                >
                  {materialUploadStatus === "uploading" ? "Enviando..." : materialUploadMessage}
                </p>
              ) : null}
              {materialFileClientError ? <p className="text-xs text-red-600">{materialFileClientError}</p> : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void uploadMaterialBeforeSubmit()}
                  disabled={!selectedMaterialFileName || Boolean(materialFileClientError) || materialUploadStatus === "uploading"}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {materialUploadStatus === "uploading"
                    ? "Enviando anexo..."
                    : materialUploadStatus === "uploaded"
                      ? "Reenviar anexo"
                      : "Enviar anexo agora"}
                </button>
                {uploadedMaterialMetadata ? (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Anexo enviado
                  </span>
                ) : null}
              </div>
            </label>
          ) : null}
        </section>

        <div className="flex items-center justify-end">
          <SubmitLessonButton
            disabled={
              !hasModules ||
              selectedModuleId.length === 0 ||
              Boolean(materialFileClientError) ||
              materialUploadStatus === "uploading"
            }
          />
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
