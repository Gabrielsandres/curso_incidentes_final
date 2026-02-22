export const DEFAULT_COURSE_COVER_URL = "/capa_curso.png";

export function resolveCourseCoverUrl(coverImageUrl: string | null | undefined) {
  const normalized = typeof coverImageUrl === "string" ? coverImageUrl.trim() : "";
  return normalized.length > 0 ? normalized : DEFAULT_COURSE_COVER_URL;
}
