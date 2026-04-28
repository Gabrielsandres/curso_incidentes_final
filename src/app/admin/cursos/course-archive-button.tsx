"use client";

import { useState, useTransition } from "react";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { archiveCourseAction } from "@/app/actions/upsert-course";
import { initialCourseFormState } from "@/app/actions/course-form-state";

export function CourseArchiveButton({
  courseId,
  courseTitle,
}: {
  courseId: string;
  courseTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("course_id", courseId);
      await archiveCourseAction(initialCourseFormState, fd);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded px-2 py-1.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        aria-label={`Arquivar curso ${courseTitle}`}
      >
        Arquivar
      </button>
      <ConfirmationDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Arquivar este curso?"
        body="O curso será removido da listagem dos alunos. Certificados e histórico de progresso já emitidos são preservados. Esta ação pode ser revertida via suporte."
        confirmLabel="Arquivar curso"
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  );
}
