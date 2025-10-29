"use client";

import { useFormState, useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "@/app/(auth)/login/actions";

const initialState: LoginActionState = {};

type LoginFormProps = {
  redirectTo?: string;
};

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, dispatch] = useFormState(loginAction, initialState);

  return (
    <form action={dispatch} className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Acessar plataforma</h1>
        <p className="text-sm text-slate-500">Informe suas credenciais para entrar</p>
      </div>

      {state?.error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</div>
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
          placeholder="••••••"
        />
      </label>

      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}
