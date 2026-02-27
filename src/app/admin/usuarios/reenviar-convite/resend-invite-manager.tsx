"use client";

import { type FormEvent, useState } from "react";

import { callAdminUserFunction } from "@/lib/admin/call-admin-user-function";

type ResendInviteFieldErrors = Partial<Record<"email" | "full_name", string[]>>;

export function ResendInviteManager() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ResendInviteFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const full_name = String(formData.get("full_name") ?? "").trim();

    const nextFieldErrors: ResendInviteFieldErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      nextFieldErrors.email = ["Email e obrigatorio."];
    } else if (!emailPattern.test(email)) {
      nextFieldErrors.email = ["Informe um email valido."];
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setSuccessMessage("");
      setErrorMessage("Revise os dados informados.");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await callAdminUserFunction({
        action: "resend_invite",
        email,
        full_name: full_name || undefined,
      });

      if (!result.ok) {
        console.error("Falha ao reenviar convite via Edge Function", {
          status: result.status,
          details: result.details,
        });
        setErrorMessage(result.message);
        return;
      }

      const responseMessage =
        typeof result.data === "object" &&
        result.data !== null &&
        "message" in result.data &&
        typeof (result.data as Record<string, unknown>).message === "string"
          ? ((result.data as Record<string, unknown>).message as string)
          : "Convite reenviado com sucesso.";

      setSuccessMessage(responseMessage);
      form.reset();
    } catch (error) {
      console.error("Erro inesperado ao reenviar convite", error);
      setErrorMessage("Nao foi possivel reenviar o convite. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Usuarios</p>
        <h2 className="text-xl font-semibold text-slate-900">Reenviar convite</h2>
        <p className="text-sm text-slate-600">
          Informe o email para reenviar o convite. O nome completo e opcional e, quando enviado, atualiza a metadata do
          convite.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Email *</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="usuario@empresa.com"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={fieldErrors.email} />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Nome completo (opcional)</span>
            <input
              type="text"
              name="full_name"
              placeholder="Ex.: Maria Silva"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={fieldErrors.full_name} />
          </label>
        </div>

        {errorMessage || successMessage ? (
          <div
            className={`rounded-lg px-3 py-2 text-sm ${
              successMessage
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
            role="status"
            aria-live="polite"
          >
            {successMessage || errorMessage}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Reenviando..." : "Reenviar convite"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
