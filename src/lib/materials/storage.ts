export const LESSON_MATERIALS_BUCKET = "lesson-materials";
export const MAX_MATERIAL_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_MATERIAL_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "png",
  "jpg",
  "jpeg",
]);

export type MaterialUploadValidationResult =
  | { ok: true; extension: string; safeFileName: string }
  | { ok: false; message: string };

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1)?.toLowerCase() ?? "";
}

export function validateMaterialFile(file: File): MaterialUploadValidationResult {
  if (!file || file.size === 0) {
    return { ok: false, message: "Selecione um arquivo valido." };
  }

  if (file.size > MAX_MATERIAL_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: "O arquivo excede o limite de 20MB para materiais complementares.",
    };
  }

  const originalName = file.name?.trim() || "arquivo";
  const extension = getFileExtension(originalName);

  if (!extension || !ALLOWED_MATERIAL_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      message: "Tipo de arquivo nao permitido. Use PDF, Office, ZIP, PNG ou JPG.",
    };
  }

  const safeFileName = sanitizeFileName(originalName) || `arquivo.${extension}`;

  return { ok: true, extension, safeFileName };
}

export function buildLessonMaterialStoragePath(params: {
  courseId: string;
  lessonId: string;
  fileName: string;
  now?: Date;
}) {
  const timestamp = (params.now ?? new Date()).toISOString().replace(/[:.]/g, "-");
  return `courses/${params.courseId}/lessons/${params.lessonId}/${timestamp}-${params.fileName}`;
}

export function formatFileSize(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) {
    return null;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}
