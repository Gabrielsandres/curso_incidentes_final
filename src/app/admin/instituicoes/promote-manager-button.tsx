"use client";

import { useActionState, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import {
  demoteInstitutionManagerAction,
  promoteInstitutionManagerAction,
} from "@/app/actions/promote-institution-manager";
import {
  initialDemoteManagerFormState,
  initialPromoteManagerFormState,
} from "@/app/actions/promote-institution-manager-state";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

type Mode = "promote-no-prior" | "promote-with-prior" | "demote";

interface Props {
  institutionId: string;
  institutionSlug: string;
  institutionName: string;
  profileId: string;
  fullName: string;
  mode: Mode;
  priorManagerName?: string;
}

export function PromoteManagerButton({
  institutionId,
  institutionSlug,
  profileId,
  fullName,
  mode,
  priorManagerName,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const isDemote = mode === "demote";
  const [state, formAction, isPending] = useActionState(
    isDemote ? demoteInstitutionManagerAction : promoteInstitutionManagerAction,
    isDemote ? initialDemoteManagerFormState : initialPromoteManagerFormState,
  );

  function submit() {
    setDialogOpen(false);
    const formData = new FormData();
    formData.set("institution_id", institutionId);
    formData.set("profile_id", profileId);
    formData.set("institution_slug", institutionSlug);
    startTransition(() => {
      formAction(formData);
    });
  }

  function handleClick() {
    // No-dialog branch: promote with no prior manager (UI-SPEC §Promover hierarchy)
    if (mode === "promote-no-prior") {
      submit();
      return;
    }
    setDialogOpen(true);
  }

  // Visual classes per UI-SPEC §Promover button hierarchy.
  let buttonClass = "";
  let label = "";
  let pendingLabel = "";

  if (mode === "promote-no-prior") {
    buttonClass =
      "inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500";
    label = "Promover a gestor";
    pendingLabel = "Promovendo…";
  } else if (mode === "promote-with-prior") {
    buttonClass =
      "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70";
    label = "Promover a gestor";
    pendingLabel = "Promovendo…";
  } else {
    // demote
    buttonClass =
      "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70";
    label = "Rebaixar a aluno";
    pendingLabel = "Rebaixando…";
  }

  const dialogTitle = isDemote
    ? `Rebaixar ${fullName} a aluno?`
    : `Promover ${fullName} a gestor?`;
  const dialogBody = isDemote
    ? `${fullName} perderá acesso ao painel /gestor. O histórico de progresso e os certificados da equipe permanecem.`
    : `${priorManagerName ?? "O gestor anterior"} será automaticamente rebaixado(a) a aluno. Apenas um gestor por instituição é permitido. Esta ação pode ser revertida depois.`;
  const confirmLabel = isDemote ? "Rebaixar" : "Promover";

  return (
    <>
      {state.success === false && state.message ? (
        <p className="sr-only" role="alert" aria-live="polite">
          {state.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={buttonClass}
        aria-label={`${label} ${fullName}`}
      >
        {isPending ? (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </button>

      <ConfirmationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogTitle}
        body={dialogBody}
        confirmLabel={confirmLabel}
        pendingLabel={pendingLabel}
        onConfirm={submit}
        isPending={isPending}
      />
    </>
  );
}
