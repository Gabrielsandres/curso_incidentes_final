import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminInstitutionList } from "@/lib/institutions/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Instituições | Admin — Gestão de Incidentes",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminInstituicoesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on /admin/instituicoes",
      error.message,
    );
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin/instituicoes" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const institutions = await getAdminInstitutionList(supabase);
  const totalMembers = institutions.reduce((sum, i) => sum + i.memberCount, 0);
  const withManager = institutions.filter((i) => i.hasManager).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">
            Gestão de Incidentes ·{" "}
            <span className="font-normal text-slate-500">Área restrita (admin)</span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            INSTITUIÇÕES
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Instituições contratantes
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Gerencie instituições B2B, vincule alunos e atribua um gestor por instituição.
          </p>
          {institutions.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              {institutions.length}{" "}
              {institutions.length === 1 ? "instituição" : "instituições"} ·{" "}
              {totalMembers} alunos vinculados · {withManager} com gestor atribuído
            </p>
          )}
          <div className="mt-4">
            <Link
              href="/admin/instituicoes/nova"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Nova instituição
            </Link>
          </div>
        </div>

        {institutions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center gap-3">
            <Building2 size={32} className="text-slate-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma instituição cadastrada
            </p>
            <p className="text-sm text-slate-500">
              Crie a primeira instituição para começar a vincular alunos B2B.
            </p>
            <Link
              href="/admin/instituicoes/nova"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 mt-2"
            >
              Nova instituição
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {institutions.map((inst) => (
              <article
                key={inst.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-1 flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {inst.name}
                    </span>
                    {inst.hasManager ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                        Com gestor
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-xs font-medium">
                        Sem gestor
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{inst.slug}</p>
                  <p className="text-xs text-slate-500">
                    {inst.memberCount}{" "}
                    {inst.memberCount === 1 ? "aluno" : "alunos"} · Criada em{" "}
                    {formatDate(inst.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/instituicoes/${inst.slug}`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                  >
                    Editar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
