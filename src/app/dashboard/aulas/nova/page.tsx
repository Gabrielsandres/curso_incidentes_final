import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { getModulesForLessonForm } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CreateLessonForm } from "./lesson-form";

export const metadata: Metadata = {
  title: "Nova aula | Gestao de Incidentes",
};

export default async function NewLessonPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/dashboard/aulas/nova" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    redirect("/dashboard");
  }

  const modules = await getModulesForLessonForm(supabase);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestao de Incidentes</span>
            <span className="text-xs text-slate-500">Cadastro de aulas (admin)</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Voltar ao dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Nova aula</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Cadastrar nova aula</h1>
          <p className="mt-2 text-sm text-slate-600">
            Preencha os campos abaixo para criar uma aula em um módulo existente. Apenas administradores podem acessar
            esta tela; a checagem também é feita na ação no servidor.
          </p>
        </div>

        <CreateLessonForm modules={modules} />
      </main>
    </div>
  );
}
