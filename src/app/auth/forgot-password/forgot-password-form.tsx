"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const redirectTo = useMemo(() => {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?type=recovery`;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/accept-invite?type=recovery`;
    }

    return "http://localhost:3000/auth/accept-invite?type=recovery";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailPattern.test(email)) {
      setSuccessMessage("");
      setErrorMessage("Informe um email valido.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        console.error("Erro ao solicitar recuperacao de senha", error);
        setErrorMessage("Nao foi possivel enviar o email de recuperacao. Tente novamente.");
        return;
      }

      setSuccessMessage("Enviamos um link para redefinir sua senha. Verifique seu email.");
      form.reset();
    } catch (error) {
      console.error("Erro inesperado ao solicitar recuperacao de senha", error);
      setErrorMessage("Nao foi possivel enviar o email de recuperacao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Esqueci minha senha</h1>
        <p className="text-sm text-slate-500">Informe seu email para receber o link de redefinicao.</p>
      </div>

      {errorMessage || successMessage ? (
        <div
          className={`rounded border px-3 py-2 text-sm ${
            successMessage ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {successMessage || errorMessage}
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nome@escola.com"
          disabled={isSubmitting}
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Enviando..." : "Enviar link de recuperacao"}
      </button>

      <Link href="/login" className="text-center text-sm font-medium text-sky-700 transition hover:text-sky-800">
        Voltar para login
      </Link>
    </form>
  );
}
