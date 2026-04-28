import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarCheck, Archive } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { StatusBadge, deriveCourseStatus } from "@/components/admin/status-badge";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminCourseList } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CourseArchiveButton } from "./course-archive-button";

export const metadata: Metadata = {
  title: "Catálogo de cursos | Admin — Gestão de Incidentes",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminCursosPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on /admin/cursos", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin/cursos" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const courses = await getAdminCourseList(supabase);

  const stats = courses.reduce(
    (acc, course) => {
      const status = deriveCourseStatus(course.published_at, course.archived_at);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statsLineParts: string[] = [];
  if (stats.publicado) statsLineParts.push(`${stats.publicado} publicado${stats.publicado !== 1 ? "s" : ""}`);
  if (stats.rascunho) statsLineParts.push(`${stats.rascunho} rascunho${stats.rascunho !== 1 ? "s" : ""}`);
  if (stats.arquivado) statsLineParts.push(`${stats.arquivado} arquivado${stats.arquivado !== 1 ? "s" : ""}`);
  const statsLine = statsLineParts.join(" · ");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">
            Gestão de Incidentes · <span className="font-normal text-slate-500">Área restrita (admin)</span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CATÁLOGO</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Catálogo de cursos</h1>
          <p className="mt-1 text-sm text-slate-600">Gerencie cursos publicados, rascunhos e arquivados.</p>
          {courses.length > 0 && statsLine && (
            <p className="mt-2 text-sm text-slate-500">{statsLine}</p>
          )}
          <div className="mt-4">
            <Link
              href="/admin/cursos/novo"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Novo curso
            </Link>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center flex flex-col items-center gap-3">
            <BookOpen size={32} className="text-slate-400" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-700">Nenhum curso cadastrado</p>
            <p className="text-sm text-slate-500">Crie o primeiro curso para começar.</p>
            <Link
              href="/admin/cursos/novo"
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
            >
              Novo curso
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const status = deriveCourseStatus(course.published_at, course.archived_at);
              const isArquivado = status === "arquivado";
              return (
                <article
                  key={course.id}
                  className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 ${isArquivado ? "opacity-60" : ""}`}
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900" />

                  <div className="flex flex-1 flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900 truncate">{course.title}</span>
                      <StatusBadge status={status} />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{course.slug}</p>
                    <p className="text-xs text-slate-500">
                      Criado em {formatDate(course.created_at)}
                    </p>
                    {course.published_at && !isArquivado && (
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <CalendarCheck size={14} aria-hidden="true" />
                        Publicado em {formatDate(course.published_at)}
                      </p>
                    )}
                    {isArquivado && course.archived_at && (
                      <p className="flex items-center gap-1 text-xs text-amber-600">
                        <Archive size={14} aria-hidden="true" />
                        Arquivado em {formatDate(course.archived_at)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/cursos/${course.slug}`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
                    >
                      Editar
                    </Link>
                    {!isArquivado && (
                      <CourseArchiveButton courseId={course.id} courseTitle={course.title} />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
