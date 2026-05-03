import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Breadcrumb } from "@/components/admin/breadcrumb";
import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { NewInstitutionForm } from "./new-institution-form";

export const metadata: Metadata = {
  title: "Nova instituição | Admin — Gestão de Incidentes",
};

export default async function NovaInstituicaoPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on /admin/instituicoes/nova",
      error.message,
    );
  }

  if (!user) {
    const search = new URLSearchParams({
      redirectTo: "/admin/instituicoes/nova",
    });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

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
            Nova instituição
          </h1>
          <div className="mt-2">
            <Breadcrumb
              items={[
                { label: "Instituições", href: "/admin/instituicoes" },
                { label: "Nova instituição" },
              ]}
            />
          </div>
        </div>
        <NewInstitutionForm />
      </main>
    </div>
  );
}
