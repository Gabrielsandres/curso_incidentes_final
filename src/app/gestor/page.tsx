import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Building2 } from "lucide-react";

import { ensureProfileExists } from "@/lib/auth/profiles";
import { fetchUserRole } from "@/lib/auth/roles";
import { getInstitutionForManager } from "@/lib/institutions/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ProgressMatrix } from "./progress-matrix";
import { InstitutionCertificatesTable } from "./institution-certificates-table";

export const metadata: Metadata = {
  title: "Painel da instituição | Gestão de Incidentes",
};

function MatrixSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="space-y-3">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <div className="h-10 w-32 animate-pulse rounded bg-slate-100" />
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className="h-10 flex-1 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function GestorPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) {
    logger.error("Failed to load authenticated session on /gestor", userErr.message);
  }
  if (!user) {
    // Defense in depth — middleware already gates, but stale cookies could slip through
    redirect("/login?redirectTo=/gestor");
  }

  // Defense-in-depth role check (middleware already gates; preserves admin-redirect symmetry)
  const role = await fetchUserRole(supabase, user.id);
  if (role === "admin") redirect("/admin/instituicoes");
  if (role !== "institution_manager") redirect("/dashboard");

  // Pitfall 6 + ensureProfileExists guardrail (mirror dashboard pattern at src/app/dashboard/page.tsx:43)
  // CRITICAL: ensureProfileExists signature is `(userId: string, metadata?: { fullName?: string })`
  // — passing a SupabaseClient as the second arg fails npm run typecheck. Use the void-call form
  // exactly like /dashboard does.
  void ensureProfileExists(user.id);

  // Resolve the manager's institution via RLS-respecting server client (D-04)
  const inst = await getInstitutionForManager(supabase, user.id);
  if (!inst) {
    // Pitfall 1 + D-02: orphan manager flow. Redirect to dashboard with flash.
    redirect("/dashboard?notice=orphan-manager");
  }

  // Resolve current user name (display only)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const userName = profile?.full_name ?? "gestor";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
      {/* Hero card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">INSTITUIÇÃO</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 flex items-center gap-2">
          <Building2 size={20} className="text-slate-500" aria-hidden="true" />
          {inst.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">Olá, {userName}.</p>
      </section>

      {/* Matrix section (Suspense-wrapped per UI-SPEC §Loading states) */}
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">EQUIPE</p>
          <h2 className="text-xl font-semibold text-slate-900">Progresso da equipe</h2>
          <p className="text-sm text-slate-600">
            Acompanhe o progresso de cada aluno por curso. Matrículas expiradas aparecem em cinza com o histórico preservado.
          </p>
        </div>
        <Suspense fallback={<MatrixSkeleton />}>
          <ProgressMatrix institutionId={inst.id} />
        </Suspense>
      </section>

      {/* Certificates section */}
      <section className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CERTIFICADOS</p>
          <h2 className="text-xl font-semibold text-slate-900">Certificados emitidos</h2>
          <p className="text-sm text-slate-600">Lista de certificados gerados para alunos da sua equipe.</p>
        </div>
        <InstitutionCertificatesTable institutionId={inst.id} />
      </section>
    </main>
  );
}
