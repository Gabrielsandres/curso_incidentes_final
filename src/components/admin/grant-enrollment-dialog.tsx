"use client";

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";

import {
  grantEnrollmentBatchAction,
  grantEnrollmentWithInviteAction,
  type EnrollmentFormState,
} from "@/app/actions/grant-enrollment";
import { initialEnrollmentState } from "@/app/actions/grant-enrollment-state";

export interface StudentOption {
  id: string;
  fullName: string;
  email: string;
}

interface GrantEnrollmentDialogProps {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  /** All students not yet enrolled in this course */
  availableStudents: StudentOption[];
}

type Tab = "list" | "invite";

function ExpiryToggle({ noExpiry, onToggle }: { noExpiry: boolean; onToggle: (v: boolean) => void }) {
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
            name="expires_at"
            required
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          />
        </label>
      )}
    </div>
  );
}

export function GrantEnrollmentDialog({
  courseId,
  courseSlug,
  courseTitle,
  availableStudents,
}: GrantEnrollmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("list");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [noExpiry, setNoExpiry] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [, startTransition] = useTransition();
  const [batchState, batchFormAction, isBatchPending] = useActionState<EnrollmentFormState, FormData>(
    grantEnrollmentBatchAction,
    initialEnrollmentState,
  );
  const [inviteState, inviteFormAction, isInvitePending] = useActionState<EnrollmentFormState, FormData>(
    grantEnrollmentWithInviteAction,
    initialEnrollmentState,
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    setTab("list");
    setSearch("");
    setSelected(new Set());
    setNoExpiry(true);
    setInviteEmail("");
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  useEffect(() => {
    if (batchState.success || inviteState.success) {
      const t = setTimeout(() => handleClose(), 2000);
      return () => clearTimeout(t);
    }
  }, [batchState.success, inviteState.success, handleClose]);

  const filtered = availableStudents.filter((s) => {
    const q = search.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  function toggleStudent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s.id)));
    }
  }

  function handleBatchGrant() {
    const formData = new FormData();
    formData.set("course_id", courseId);
    formData.set("course_slug", courseSlug);
    if (!noExpiry) {
      const dateInput = document.querySelector<HTMLInputElement>('input[name="expires_at"]');
      if (dateInput?.value) formData.set("expires_at", dateInput.value);
    }
    for (const id of selected) {
      formData.append("user_ids[]", id);
    }
    startTransition(() => {
      batchFormAction(formData);
    });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        <UserPlus size={16} aria-hidden="true" />
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
            className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-lg"
            style={{ maxHeight: "min(90vh, 680px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 pt-6 pb-4">
              <div>
                <h3 id="grant-dialog-title" className="text-lg font-semibold text-slate-900">
                  Conceder acesso
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">{courseTitle}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="ml-4 inline-flex items-center justify-center rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              {(["list", "invite"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-1 pb-3 pt-3 text-sm font-medium transition ${
                    tab === t
                      ? "border-sky-600 text-sky-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  } ${t === "invite" ? "ml-6" : ""}`}
                >
                  {t === "list" ? "Alunos cadastrados" : "Convidar por email"}
                </button>
              ))}
            </div>

            {/* Success banner */}
            {(batchState.success || inviteState.success) && (
              <div
                role="status"
                aria-live="polite"
                className="mx-6 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                ✓ {batchState.success ? batchState.message : inviteState.message}
              </div>
            )}

            {/* Error banner */}
            {!batchState.success && batchState.message && (
              <div
                role="alert"
                aria-live="polite"
                className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {batchState.message}
              </div>
            )}
            {!inviteState.success && inviteState.message && tab === "invite" && (
              <div
                role="alert"
                aria-live="polite"
                className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {inviteState.message}
              </div>
            )}

            {/* Tab: list */}
            {tab === "list" && (
              <>
                {/* Search + select-all */}
                <div className="space-y-2 px-6 pt-4">
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      aria-hidden="true"
                    />
                    <input
                      ref={searchRef}
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nome ou email…"
                      className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  {filtered.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600"
                      />
                      {allFilteredSelected ? "Desmarcar todos" : `Selecionar todos (${filtered.length})`}
                    </label>
                  )}
                </div>

                {/* Student list */}
                <div className="mt-2 flex-1 overflow-y-auto px-6">
                  {availableStudents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Todos os alunos cadastrados já têm acesso a este curso.
                    </p>
                  ) : filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-500">
                      Nenhum aluno encontrado para &quot;{search}&quot;.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100" role="listbox" aria-multiselectable="true">
                      {filtered.map((student) => {
                        const isSelected = selected.has(student.id);
                        return (
                          <li key={student.id}>
                            <label className="flex cursor-pointer items-center gap-3 py-2.5 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleStudent(student.id)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                aria-label={`${student.fullName} (${student.email})`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-800">{student.fullName}</p>
                                <p className="truncate text-xs text-slate-500">{student.email}</p>
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <div className="space-y-3 border-t border-slate-200 px-6 py-4">
                  <ExpiryToggle noExpiry={noExpiry} onToggle={setNoExpiry} />
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">
                      {selected.size > 0
                        ? `${selected.size} aluno${selected.size !== 1 ? "s" : ""} selecionado${selected.size !== 1 ? "s" : ""}`
                        : "Nenhum selecionado"}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchGrant}
                        disabled={selected.size === 0 || isBatchPending}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBatchPending ? (
                          <>
                            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                            Concedendo…
                          </>
                        ) : (
                          "Conceder acesso"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab: invite */}
            {tab === "invite" && (
              <form
                action={(formData) => {
                  formData.set("course_id", courseId);
                  formData.set("course_slug", courseSlug);
                  if (noExpiry) formData.delete("expires_at");
                  startTransition(() => inviteFormAction(formData));
                }}
                className="flex flex-col gap-4 px-6 py-4"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-700">Email do novo aluno *</span>
                  <input
                    type="email"
                    name="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    autoComplete="off"
                    placeholder="aluno@escola.edu.br"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </label>

                <ExpiryToggle noExpiry={noExpiry} onToggle={setNoExpiry} />

                <p className="text-xs text-slate-500">
                  Um convite de cadastro será enviado. O acesso ao curso é concedido assim que o aluno aceitar.
                </p>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isInvitePending}
                    className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isInvitePending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        Enviando…
                      </>
                    ) : (
                      "Enviar convite"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
