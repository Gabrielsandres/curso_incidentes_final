"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";

import {
  grantEnrollmentAction,
  grantEnrollmentWithInviteAction,
  lookupProfileByEmailAction,
  initialEnrollmentState,
  type EnrollmentFormState,
} from "@/app/actions/grant-enrollment";

interface GrantEnrollmentDialogProps {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

interface ExpiryToggleProps {
  nameAttr: string;
  noExpiry: boolean;
  onToggle: (checked: boolean) => void;
}

function ExpiryToggle({ nameAttr, noExpiry, onToggle }: ExpiryToggleProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={noExpiry}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        Sem data de expiração (acesso vitalício)
      </label>
      {!noExpiry && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Data de expiração *</span>
          <input
            type="date"
            name={nameAttr}
            required
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>
      )}
    </div>
  );
}

function LookupSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          Buscando...
        </>
      ) : (
        "Buscar aluno"
      )}
    </button>
  );
}

function GrantSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
  );
}

export function GrantEnrollmentDialog({ courseId, courseSlug, courseTitle }: GrantEnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedEmail, setSearchedEmail] = useState("");
  const [noExpiry, setNoExpiry] = useState(true);
  const [formKey, setFormKey] = useState(0);

  const [lookupState, lookupFormAction] = useActionState<EnrollmentFormState, FormData>(
    lookupProfileByEmailAction,
    initialEnrollmentState,
  );
  const [grantState, grantFormAction] = useActionState<EnrollmentFormState, FormData>(
    grantEnrollmentAction,
    initialEnrollmentState,
  );
  const [inviteState, inviteFormAction] = useActionState<EnrollmentFormState, FormData>(
    grantEnrollmentWithInviteAction,
    initialEnrollmentState,
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setHasSearched(false);
    setSearchedEmail("");
    setNoExpiry(true);
    setFormKey((k) => k + 1);
    triggerRef.current?.focus();
  }, []);

  // Focus email input on open
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => emailInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Escape key closes dialog
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        handleClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  // Auto-close on success after 2s
  useEffect(() => {
    if (grantState.success || inviteState.success) {
      const timeout = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [grantState.success, inviteState.success, handleClose]);

  function handleLookupSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    setSearchedEmail(email);
    setHasSearched(true);
    lookupFormAction(formData);
  }

  // Derive dialog state
  // Defensive: grantState.message may be undefined in initial state (before any submission)
  // depending on initial state shape; optional chaining + ?? false guard handles that.
  const isAlreadyEnrolledError =
    !grantState.success && (grantState.message?.includes("já tem acesso") ?? false);

  const profileFound = hasSearched && lookupState.success && lookupState.foundProfile != null;
  const profileNotFound =
    hasSearched && !lookupState.success && lookupState.foundProfile === null && lookupState.message === "";

  const showSuccess = grantState.success || inviteState.success;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Conceder acesso
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="grant-dialog-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Fechar dialog"
              className="absolute right-4 top-4 inline-flex items-center justify-center rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <h3 id="grant-dialog-title" className="text-lg font-semibold text-slate-900">
              Conceder acesso ao curso
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Informe o email do aluno para conceder acesso a {courseTitle}.
            </p>

            {/* Success state */}
            {showSuccess && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                {grantState.success ? grantState.message : inviteState.message}
              </div>
            )}

            {/* State E: already enrolled error */}
            {isAlreadyEnrolledError && (
              <div className="mt-4 space-y-4">
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  ✕ {grantState.message}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {!showSuccess && !isAlreadyEnrolledError && (
              <div key={formKey} className="mt-4 space-y-4">

                {/* State A/B: idle / searching — lookup form */}
                {!profileFound && !profileNotFound && (
                  <form action={handleLookupSubmit} className="space-y-4">
                    <input type="hidden" name="course_id" value={courseId} />

                    <label className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium text-slate-700">Email do aluno *</span>
                      <input
                        ref={emailInputRef}
                        type="email"
                        name="email"
                        required
                        autoComplete="off"
                        placeholder="aluno@escola.edu.br"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />
                      {lookupState.fieldErrors?.email && (
                        <p className="text-xs text-red-600">{lookupState.fieldErrors.email[0]}</p>
                      )}
                    </label>

                    <ExpiryToggle nameAttr="expires_at_display" noExpiry={noExpiry} onToggle={setNoExpiry} />

                    {lookupState.message !== "" && !lookupState.success && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                      >
                        {lookupState.message}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <LookupSubmitButton />
                    </div>
                  </form>
                )}

                {/* State C: profile found */}
                {profileFound && lookupState.foundProfile && (
                  <>
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                      ✓ Aluno encontrado: {lookupState.foundProfile.fullName} ({lookupState.foundProfile.email})
                    </div>

                    <form action={grantFormAction} className="space-y-4">
                      <input type="hidden" name="user_id" value={lookupState.foundProfile.id} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <input type="hidden" name="course_slug" value={courseSlug} />

                      <ExpiryToggle nameAttr="expires_at" noExpiry={noExpiry} onToggle={setNoExpiry} />

                      {grantState.message !== "" && !grantState.success && !isAlreadyEnrolledError && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                          {grantState.message}
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <GrantSubmitButton label="Conceder acesso" pendingLabel="Concedendo..." />
                      </div>
                    </form>
                  </>
                )}

                {/* State D: profile not found */}
                {profileNotFound && (
                  <>
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"
                    >
                      ⚠ Não encontramos esse email. Deseja enviar um convite e conceder o acesso quando aceitar?
                    </div>

                    <form action={inviteFormAction} className="space-y-4">
                      <input type="hidden" name="email" value={searchedEmail} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <input type="hidden" name="course_slug" value={courseSlug} />

                      <ExpiryToggle nameAttr="expires_at" noExpiry={noExpiry} onToggle={setNoExpiry} />

                      {inviteState.message !== "" && !inviteState.success && (
                        <div
                          role="status"
                          aria-live="polite"
                          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                          {inviteState.message}
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleClose}
                          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                        <GrantSubmitButton
                          label="Enviar convite e conceder acesso"
                          pendingLabel="Enviando convite..."
                        />
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
