"use client";

import { type FormEvent, useState } from "react";

import { callAdminUserFunction } from "@/lib/admin/call-admin-user-function";

type CreateUserFieldErrors = Partial<Record<"full_name" | "email" | "password", string[]>>;

export function UserManager() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<CreateUserFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const full_name = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const nextFieldErrors: CreateUserFieldErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!full_name) {
      nextFieldErrors.full_name = ["Nome completo e obrigatorio."];
    }

    if (!email) {
      nextFieldErrors.email = ["Email e obrigatorio."];
    } else if (!emailPattern.test(email)) {
      nextFieldErrors.email = ["Informe um email valido."];
    }

    if (password.length < 8) {
      nextFieldErrors.password = ["Senha deve ter pelo menos 8 caracteres."];
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
        action: "create",
        email,
        password,
        full_name,
      });

      if (!result.ok) {
        console.error("Falha ao cadastrar usuario via Edge Function", {
          status: result.status,
          details: result.details,
        });
        setErrorMessage(result.message);
        return;
      }

      setSuccessMessage("Usuario cadastrado com sucesso.");
      form.reset();
    } catch (error) {
      console.error("Erro inesperado ao cadastrar usuario", error);
      setErrorMessage("Nao foi possivel cadastrar o usuario. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Usuarios</p>
        <h2 className="text-xl font-semibold text-slate-900">Cadastrar usuario</h2>
        <p className="text-sm text-slate-600">
          Crie usuarios no Supabase Auth. O perfil e a role sao definidos automaticamente pelos gatilhos do banco.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nome completo *</span>
            <input
              type="text"
              name="full_name"
              required
              placeholder="Ex.: Maria Silva"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={fieldErrors.full_name} />
          </label>

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
            <span className="text-sm font-medium text-slate-700">Senha *</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="new-password"
              placeholder="Min. 8 caracteres"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
            <FieldError errors={fieldErrors.password} />
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
          <SubmitButton label="Cadastrar usuario" pendingLabel="Cadastrando..." pending={isSubmitting} />
        </div>
      </form>
    </section>
  );
}

function SubmitButton({ label, pendingLabel, pending }: { label: string; pendingLabel: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) {
    return null;
  }

  return <p className="text-xs text-red-600">{errors[0]}</p>;
}
