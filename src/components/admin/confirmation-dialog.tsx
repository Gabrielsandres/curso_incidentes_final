"use client";

import { useEffect, useRef } from "react";

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmationDialog({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  pendingLabel,
  onConfirm,
  isPending = false,
}: ConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = "confirmation-dialog-title";

  // Focus the cancel button when dialog opens (safer default — prevents accidental Enter confirm)
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handlePanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const focusable = [cancelRef.current, confirmRef.current].filter(Boolean) as HTMLButtonElement[];
    if (focusable.length < 2) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  const resolvedPendingLabel = pendingLabel ?? `${confirmLabel}...`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <h3 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? resolvedPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
