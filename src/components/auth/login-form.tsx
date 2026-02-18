"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const email = (formData.get("email") as string | null)?.trim();
      const password = formData.get("password") as string | null;

      if (!email || !password) {
        setError("Informe email e senha.");
        return;
      }

      setPending(true);
      setError(null);

      try {
        const supabase = getSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError("Credenciais inválidas. Confira e tente novamente.");
          return;
        }

        router.replace(redirectTo ?? "/dashboard");
        router.refresh();
      } catch (signInException) {
        console.error("Erro ao autenticar Supabase", signInException);
        setError("Ocorreu um erro inesperado. Tente novamente.");
      } finally {
        setPending(false);
      }
    },
    [redirectTo, router],
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Acessar plataforma</h1>
        <p className="text-sm text-slate-500">Informe suas credenciais para entrar</p>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nome@escola.com"
          disabled={pending}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-slate-700">Senha</span>
        <input
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="******"
          disabled={pending}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
