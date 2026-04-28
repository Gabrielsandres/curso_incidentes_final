type CourseStatus = "rascunho" | "publicado" | "arquivado";

const statusClasses: Record<CourseStatus, string> = {
  rascunho:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300",
  publicado:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200",
  arquivado:
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200",
};

const statusLabels: Record<CourseStatus, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return <span className={statusClasses[status]}>{statusLabels[status]}</span>;
}

export function deriveCourseStatus(
  publishedAt: string | null,
  archivedAt: string | null,
): CourseStatus {
  if (archivedAt) return "arquivado";
  if (publishedAt) return "publicado";
  return "rascunho";
}
