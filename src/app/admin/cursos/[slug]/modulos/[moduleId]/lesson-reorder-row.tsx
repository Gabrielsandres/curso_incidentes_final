"use client";

import Link from "next/link";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { reorderLessonUpAction, reorderLessonDownAction } from "../../reorder-actions";
import type { LessonRow } from "@/lib/courses/types";

interface LessonReorderRowProps {
  lesson: LessonRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  courseSlug: string;
  workloadDisplay: string;
}

export function LessonReorderRow({
  lesson,
  index,
  isFirst,
  isLast,
  courseSlug,
  workloadDisplay,
}: LessonReorderRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <ReorderButtons
        id={lesson.id}
        isFirst={isFirst}
        isLast={isLast}
        upAction={reorderLessonUpAction}
        downAction={reorderLessonDownAction}
      />
      <span className="w-6 shrink-0 text-sm font-medium text-slate-500">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-slate-900 truncate">{lesson.title}</span>
      {workloadDisplay && (
        <span className="shrink-0 text-xs text-slate-500">{workloadDisplay}</span>
      )}
      <Link
        href={`/admin/cursos/${courseSlug}/aulas/${lesson.id}`}
        className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        Editar
      </Link>
    </div>
  );
}
