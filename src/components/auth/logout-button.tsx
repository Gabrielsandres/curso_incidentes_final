"use client";

import { useFormStatus } from "react-dom";

import { logoutAction } from "@/app/actions/logout";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}
