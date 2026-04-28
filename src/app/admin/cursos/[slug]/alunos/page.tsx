import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Users } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { GrantEnrollmentDialog } from "@/components/admin/grant-enrollment-dialog";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminCourseBySlug } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RevokeEnrollmentButton } from "./revoke-enrollment-button";

export const metadata: Metadata = {
  title: "Alunos com acesso | Admin — Gestão de Incidentes",
};

const SOURCE_LABELS: Record<string, string> = {
  admin_grant: "Concessão manual",
  b2b_invite: "Convite B2B",
  b2c_purchase: "Compra B2C",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Sem expiração";
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export default async function AlunosPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on alunos page", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/admin/cursos/${slug}/alunos` });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const course = await getAdminCourseBySlug(slug, supabase);
  if (!course) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();

  const { data: enrollments, error: enrollmentsError } = await adminClient
    .from("enrollments")
    .select("id, user_id, source, granted_at, expires_at")
    .eq("course_id", course.id)
    .order("granted_at", { ascending: false })
    .limit(200);

  if (enrollmentsError) {
    logger.error("Falha ao carregar enrollments", { courseId: course.id, error: enrollmentsError.message });
  }

  // Fetch profiles for enrolled users
  const enrolledUserIds = (enrollments ?? []).map((e) => e.user_id);
  const profilesMap = new Map<string, { full_name: string; email: string | null }>();

  if (enrolledUserIds.length > 0) {
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name")
      .in("id", enrolledUserIds);

    for (const p of profiles ?? []) {
      profilesMap.set(p.id, { full_name: p.full_name, email: null });
    }
  }

  // Fetch auth emails via admin client for each enrolled user
  // Note: profiles table doesn't store email — we display user_id as fallback
  // (email lookup via auth.admin.listUsers is expensive for large sets; show user_id for now)

  const { data: pending, error: pendingError } = await adminClient
    .from("pending_enrollments")
    .select("id, email, expires_at, created_at, invited_by")
    .eq("course_id", course.id)
    .order("created_at", { ascending: false });

  if (pendingError) {
    logger.error("Falha ao carregar pending_enrollments", { courseId: course.id, error: pendingError.message });
  }

  const enrollmentList = enrollments ?? [];
  const pendingList = pending ?? [];

  const statsText =
    `${enrollmentList.length} aluno${enrollmentList.length !== 1 ? "s" : ""} com acesso ativo` +
    (pendingList.length > 0
      ? ` · ${pendingList.length} convite${pendingList.length !== 1 ? "s" : ""} pendente${pendingList.length !== 1 ? "s" : ""}`
      : "");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <Breadcrumb
          items={[
            { label: "Catálogo", href: "/admin/cursos" },
            { label: course.title, href: `/admin/cursos/${slug}` },
            { label: "Alunos com acesso" },
          ]}
        />

        {/* Stats + action card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            ACESSO AO CURSO
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Alunos com acesso</h1>
              <p className="mt-1 text-sm text-slate-600">{statsText}</p>
            </div>
            <GrantEnrollmentDialog
              courseId={course.id}
              courseSlug={slug}
              courseTitle={course.title}
            />
          </div>
        </div>

        {/* Enrollment table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {enrollmentList.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <Users size={32} className="text-slate-400" aria-hidden="true" />
              <p className="text-base font-semibold text-slate-900">Nenhum aluno com acesso ainda</p>
              <p className="text-sm text-slate-500">Conceda acesso ao primeiro aluno para começar.</p>
              <GrantEnrollmentDialog
                courseId={course.id}
                courseSlug={slug}
                courseTitle={course.title}
              />
            </div>
          ) : (
            <table className="w-full text-left">
              <caption className="sr-only">Lista de alunos com acesso ao curso</caption>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">
                    Aluno (ID)
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-sm font-medium text-slate-600 md:table-cell">
                    Nome
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-sm font-medium text-slate-600 md:table-cell">
                    Origem
                  </th>
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">
                    Concedido em
                  </th>
                  <th scope="col" className="hidden px-4 py-3 text-sm font-medium text-slate-600 md:table-cell">
                    Expira em
                  </th>
                  <th scope="col" className="px-4 py-3 text-sm font-medium text-slate-600">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollmentList.map((enrollment) => {
                  const profile = profilesMap.get(enrollment.user_id);
                  const displayId = enrollment.user_id.slice(0, 8) + "...";
                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <span className="font-mono text-xs text-slate-500">{displayId}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                        {profile?.full_name ?? "—"}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                        {SOURCE_LABELS[enrollment.source] ?? enrollment.source}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatDate(enrollment.granted_at)}
                      </td>
                      <td className="hidden px-4 py-3 text-sm text-slate-700 md:table-cell">
                        {enrollment.expires_at ? formatDate(enrollment.expires_at) : "Sem expiração"}
                      </td>
                      <td className="px-4 py-3">
                        <RevokeEnrollmentButton
                          enrollmentId={enrollment.id}
                          courseSlug={slug}
                          email={displayId}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {enrollmentList.length >= 200 && (
                <tfoot>
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-xs text-slate-500">
                      Exibindo {Math.min(enrollmentList.length, 200)} alunos.
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Pending invites section */}
        {pendingList.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">Convites pendentes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Estes emails receberão acesso ao curso assim que aceitarem o convite.
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {pendingList.map((pending) => (
                <li key={pending.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{pending.email}</p>
                    <p className="text-xs text-slate-500">
                      Convidado em {formatDate(pending.created_at)} ·{" "}
                      {pending.expires_at ? `Expira em ${formatDate(pending.expires_at)}` : "Sem expiração"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
