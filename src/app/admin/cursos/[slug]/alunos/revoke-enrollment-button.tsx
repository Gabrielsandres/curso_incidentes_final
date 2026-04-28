"use client";

import { useActionState, useState } from "react";
import { UserMinus } from "lucide-react";

import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { revokeEnrollmentAction, initialRevokeState } from "@/app/actions/revoke-enrollment";

interface RevokeEnrollmentButtonProps {
  enrollmentId: string;
  courseSlug: string;
  email: string;
}

export function RevokeEnrollmentButton({ enrollmentId, courseSlug, email }: RevokeEnrollmentButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(revokeEnrollmentAction, initialRevokeState);

  function handleConfirm() {
    const formData = new FormData();
    formData.set("enrollment_id", enrollmentId);
    formData.set("course_slug", courseSlug);
    formAction(formData);
    setDialogOpen(false);
  }

  return (
    <>
      {state.success === false && state.message && (
        <p className="sr-only" role="alert" aria-live="polite">
          {state.message}
        </p>
      )}
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={isPending}
        aria-label={`Revogar acesso de ${email}`}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <UserMinus size={16} aria-hidden="true" />
        Revogar acesso
      </button>

      <ConfirmationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Revogar acesso?"
        body={`O aluno ${email} perderá acesso imediato ao curso. Progresso e certificados já emitidos são preservados.`}
        confirmLabel="Revogar acesso"
        pendingLabel="Revogando..."
        onConfirm={handleConfirm}
        isPending={isPending}
      />
    </>
  );
}
