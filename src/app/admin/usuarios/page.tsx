import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserProfile } from "@/lib/auth/profiles";
import { fetchUserRole } from "@/lib/auth/roles";
import { getUserDisplayName } from "@/lib/auth/user-display-name";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserManager } from "./user-manager";

export const metadata: Metadata = {
  title: "Usuarios | Admin",
};

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on admin users page", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin/usuarios" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const profile = await fetchUserProfile(supabase, user.id);
  const userName = getUserDisplayName(user, profile?.full_name);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestao de Incidentes</span>
            <span className="text-xs text-slate-500">Area restrita (admin) | Ola, {userName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Voltar ao admin
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Cadastrar usuarios</h1>
          <p className="mt-2 text-sm text-slate-600">
            Apenas administradores podem criar contas. O cadastro cria o usuario no Auth e sincroniza a tabela
            `profiles` com nome completo e role.
          </p>
        </div>

        <UserManager />
      </main>
    </div>
  );
}
