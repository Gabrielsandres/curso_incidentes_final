"use client";

import { useTransition } from "react";
import { restoreLessonAction } from "@/app/actions/update-lesson";

export function LessonRestoreButton({ lessonId }: { lessonId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("lesson_id", lessonId);
      await restoreLessonAction({ success: false, message: "" }, fd);
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleRestore}
      className="ml-auto inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      {isPending ? "Restaurando..." : "Restaurar aula"}
    </button>
  );
}
