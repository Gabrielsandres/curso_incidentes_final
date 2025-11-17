import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | Gestao de Incidentes",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session", error.message);
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
            <span className="text-xs text-slate-500">Plataforma em desenvolvimento</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Bem-vindo(a), {user.email}</h1>
          <p className="text-sm text-slate-600">
            Área autenticada temporaria para o projeto Gestao de Incidentes. Os modulos de curso e administracao serao
            implementados nas proximas etapas.
          </p>
        </div>
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Proximos passos</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>- Finalizar Landing Page comercial (Etapa 1)</li>
              <li>- Ativar fluxo de checkout e captacao institucional</li>
              <li>- Publicar 12 modulos com videos e materiais</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Recursos uteis</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>
                <Link className="text-sky-700 hover:underline" href="/health">
                  Rota de saude (`/health`)
                </Link>
              </li>
              <li>
                <a className="text-sky-700 hover:underline" href="https://supabase.com/docs" target="_blank" rel="noreferrer">
                  Documentacao Supabase
                </a>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
