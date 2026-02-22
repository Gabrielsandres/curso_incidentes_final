import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  buildLessonMaterialStoragePath,
  LESSON_MATERIALS_BUCKET,
  validateMaterialFile,
} from "@/lib/materials/storage";

export type UploadedLessonMaterialMetadata = {
  bucket: string;
  path: string;
  mimeType: string | null;
  sizeBytes: number;
  originalFileName: string;
};

export async function uploadLessonMaterialFile(params: {
  file: File;
  courseId: string;
  lessonId: string;
}) {
  const validation = validateMaterialFile(params.file);
  if (!validation.ok) {
    return { success: false as const, message: validation.message };
  }

  const adminSupabase = createSupabaseAdminClient();
  const storagePath = buildLessonMaterialStoragePath({
    courseId: params.courseId,
    lessonId: params.lessonId,
    fileName: validation.safeFileName,
  });

  const arrayBuffer = await params.file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  const { error } = await adminSupabase.storage.from(LESSON_MATERIALS_BUCKET).upload(storagePath, fileBytes, {
    upsert: false,
    contentType: params.file.type || undefined,
  });

  if (error) {
    logger.error("Falha ao enviar arquivo de material para Storage", {
      lessonId: params.lessonId,
      courseId: params.courseId,
      path: storagePath,
      error: error.message,
    });
    return {
      success: false as const,
      message: "Nao foi possivel enviar o arquivo de material. Tente novamente.",
    };
  }

  const metadata: UploadedLessonMaterialMetadata = {
    bucket: LESSON_MATERIALS_BUCKET,
    path: storagePath,
    mimeType: params.file.type || null,
    sizeBytes: params.file.size,
    originalFileName: params.file.name || validation.safeFileName,
  };

  return { success: true as const, metadata };
}
