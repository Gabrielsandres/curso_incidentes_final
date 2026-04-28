"use client";

import Link from "next/link";
import { ReorderButtons } from "@/components/admin/reorder-buttons";
import { reorderModuleUpAction, reorderModuleDownAction } from "./reorder-actions";
import type { ModuleRow } from "@/lib/courses/types";

interface ModuleReorderRowProps {
  module: ModuleRow;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  lessonCount: number;
  courseSlug: string;
}

export function ModuleReorderRow({
  module,
  index,
  isFirst,
  isLast,
  lessonCount,
  courseSlug,
}: ModuleReorderRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <ReorderButtons
        id={module.id}
        isFirst={isFirst}
        isLast={isLast}
        upAction={reorderModuleUpAction}
        downAction={reorderModuleDownAction}
      />
      <span className="w-6 shrink-0 text-sm font-medium text-slate-500">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-slate-900 truncate">{module.title}</span>
      <span className="shrink-0 text-xs text-slate-500">
        {lessonCount} {lessonCount === 1 ? "aula" : "aulas"}
      </span>
      <Link
        href={`/admin/cursos/${courseSlug}/modulos/${module.id}`}
        className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      >
        Editar
      </Link>
    </div>
  );
}
