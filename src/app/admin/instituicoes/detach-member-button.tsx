"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2, UserMinus } from "lucide-react";

import { detachInstitutionMemberAction } from "@/app/actions/detach-institution-member";
import { initialDetachMemberFormState } from "@/app/actions/detach-institution-member-state";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

interface Props {
  institutionId: string;
  institutionSlug: string;
  profileId: string;
  fullName: string;
}

export function DetachMemberButton({
  institutionId,
  institutionSlug,
  profileId,
  fullName,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [state, formAction, isPending] = useActionState(
    detachInstitutionMemberAction,
    initialDetachMemberFormState,
  );

  function submit() {
    setDialogOpen(false);
    const fd = new FormData();
    fd.set("institution_id", institutionId);
    fd.set("profile_id", profileId);
    fd.set("institution_slug", institutionSlug);
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <>
      {state.success === false && state.message ? (
        <p className="sr-only" role="alert" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        disabled={isPending}
        aria-label={`Desvincular ${fullName}`}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            Desvinculando…
          </>
        ) : (
          <>
            <UserMinus size={14} aria-hidden="true" />
            Desvincular
          </>
        )}
      </button>

      <ConfirmationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={`Desvincular ${fullName} da instituição?`}
        body="O aluno mantém o histórico de progresso e os certificados emitidos. Apenas o vínculo com a instituição é removido."
        confirmLabel="Desvincular"
        pendingLabel="Desvinculando…"
        onConfirm={submit}
        isPending={isPending}
      />
    </>
  );
}
