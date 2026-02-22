"use server";

import { redirect } from "next/navigation";

import { fetchUserRole } from "@/lib/auth/roles";
import { uploadLessonMaterialFile } from "@/lib/materials/upload";
import { createLessonSchema } from "@/lib/lessons/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateLessonFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

type ModuleWithCourse = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  courses: { slug: string } | null;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function createLessonAction(
  _prevState: CreateLessonFormState,
  formData: FormData,
): Promise<CreateLessonFormState> {
  const parsed = createLessonSchema.safeParse({
    moduleId: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    videoUrl: formData.get("video_url"),
    position: formData.get("position"),
    materialLabel: formData.get("material_label"),
    materialDescription: formData.get("material_description"),
    materialUrl: formData.get("material_url"),
    materialSource: formData.get("material_source"),
    materialHasFile: formData.get("material_has_file"),
    materialType: formData.get("material_type"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on create lesson", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/dashboard/aulas/nova" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    return {
      success: false,
      message: "Você não tem permissão para cadastrar aulas.",
    };
  }

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select(
      `
        id,
        course_id,
        title,
        position,
        courses:course_id (
          slug
        )
      `,
    )
    .eq("id", parsed.data.moduleId)
    .maybeSingle();

  if (moduleError) {
    logger.error("Falha ao validar módulo para cadastro de aula", { error: moduleError.message });
  }

  if (!module) {
    return {
      success: false,
      message: "O módulo selecionado não existe mais.",
    };
  }

  const draftLessonIdRaw = getOptionalString(formData, "draft_lesson_id");
  const draftLessonId = draftLessonIdRaw && UUID_REGEX.test(draftLessonIdRaw) ? draftLessonIdRaw : null;

  const { data: insertedLesson, error: insertError } = await supabase
    .from("lessons")
    .insert({
      ...(draftLessonId ? { id: draftLessonId } : {}),
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: parsed.data.videoUrl,
      position: parsed.data.position,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("Falha ao criar aula", insertError);
    const permissionDenied =
      insertError.code === "42501" || (insertError.message ?? "").toLowerCase().includes("permission denied");
    const networkFailure = (insertError.message ?? "").toLowerCase().includes("fetch failed");

    return {
      success: false,
      message: permissionDenied
        ? "Você não tem permissão para cadastrar aulas (RLS)."
        : networkFailure
          ? "Falha de conexão com o Supabase. Verifique a rede e tente novamente."
          : "Não foi possível salvar a aula. Tente novamente.",
    };
  }

  const materialLabel = parsed.data.materialLabel;
  const materialUrl = parsed.data.materialUrl;
  const materialSource = parsed.data.materialSource ?? "LINK";
  const materialFileValue = formData.get("material_file");
  const materialFile = materialFileValue instanceof File && materialFileValue.size > 0 ? materialFileValue : null;
  const uploadedMaterialBucket = getOptionalString(formData, "uploaded_material_bucket");
  const uploadedMaterialPath = getOptionalString(formData, "uploaded_material_path");
  const uploadedMaterialMimeType = getOptionalString(formData, "uploaded_material_mime_type");
  const uploadedMaterialOriginalFileName = getOptionalString(formData, "uploaded_material_original_file_name");
  const uploadedMaterialSizeBytesRaw = getOptionalString(formData, "uploaded_material_size_bytes");
  const uploadedMaterialSizeBytes = uploadedMaterialSizeBytesRaw ? Number(uploadedMaterialSizeBytesRaw) : null;
  const hasUploadedMaterialMetadata = Boolean(uploadedMaterialBucket && uploadedMaterialPath);

  if (materialLabel && materialSource === "UPLOAD" && !materialFile && !hasUploadedMaterialMetadata) {
    return {
      success: false,
      message: "Selecione um arquivo para o material complementar.",
    };
  }

  if (materialLabel && materialSource === "LINK" && materialUrl) {
    const { error: materialInsertError } = await supabase.from("materials").insert({
      lesson_id: insertedLesson.id,
      label: materialLabel,
      description: parsed.data.materialDescription ?? null,
      source_kind: "LINK",
      material_type: parsed.data.materialType ?? "OUTRO",
      resource_url: materialUrl,
    });

    if (materialInsertError) {
      logger.error("Falha ao criar material complementar da aula", {
        lessonId: insertedLesson.id,
        error: materialInsertError.message,
        code: materialInsertError.code,
      });

      return {
        success: false,
        message: "A aula foi criada, mas nao foi possivel salvar o material complementar.",
      };
    }
  }

  if (materialLabel && materialSource === "UPLOAD" && hasUploadedMaterialMetadata) {
    const { error: materialInsertError } = await supabase.from("materials").insert({
      lesson_id: insertedLesson.id,
      label: materialLabel,
      description: parsed.data.materialDescription ?? null,
      source_kind: "UPLOAD",
      material_type: parsed.data.materialType ?? "ARQUIVO",
      resource_url: null,
      storage_bucket: uploadedMaterialBucket,
      storage_path: uploadedMaterialPath,
      mime_type: uploadedMaterialMimeType,
      file_size_bytes: Number.isFinite(uploadedMaterialSizeBytes) ? uploadedMaterialSizeBytes : null,
      original_file_name: uploadedMaterialOriginalFileName,
    });

    if (materialInsertError) {
      logger.error("Falha ao salvar metadados do anexo pre-enviado da aula", {
        lessonId: insertedLesson.id,
        error: materialInsertError.message,
        code: materialInsertError.code,
      });

      return {
        success: false,
        message: "A aula foi criada, mas nao foi possivel vincular o anexo enviado.",
      };
    }
  }

  if (materialLabel && materialSource === "UPLOAD" && !hasUploadedMaterialMetadata && materialFile) {
    const uploadResult = await uploadLessonMaterialFile({
      file: materialFile,
      courseId: module.course_id,
      lessonId: insertedLesson.id,
    });

    if (!uploadResult.success) {
      return {
        success: false,
        message: `A aula foi criada, mas o anexo falhou: ${uploadResult.message}`,
      };
    }

    const { metadata } = uploadResult;
    const { error: materialInsertError } = await supabase.from("materials").insert({
      lesson_id: insertedLesson.id,
      label: materialLabel,
      description: parsed.data.materialDescription ?? null,
      source_kind: "UPLOAD",
      material_type: parsed.data.materialType ?? "ARQUIVO",
      resource_url: null,
      storage_bucket: metadata.bucket,
      storage_path: metadata.path,
      mime_type: metadata.mimeType,
      file_size_bytes: metadata.sizeBytes,
      original_file_name: metadata.originalFileName,
    });

    if (materialInsertError) {
      logger.error("Falha ao salvar metadados do anexo da aula", {
        lessonId: insertedLesson.id,
        error: materialInsertError.message,
        code: materialInsertError.code,
      });

      return {
        success: false,
        message: "A aula foi criada, mas nao foi possivel salvar os metadados do anexo.",
      };
    }
  }

  const moduleWithCourse = module as ModuleWithCourse;
  const courseSlug = moduleWithCourse.courses?.slug;

  if (courseSlug) {
    redirect(`/curso/${courseSlug}`);
  }

  redirect("/dashboard");
}
