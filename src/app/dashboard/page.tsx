import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAvailableCourses } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | Gestão de Incidentes",
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
    const search = new URLSearchParams({ redirectTo: "/dashboard" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  const courses = await getAvailableCourses(supabase, user.id);
  const totalLessons = courses.reduce((total, course) => total + course.totalLessons, 0);
  const completedLessons = courses.reduce((total, course) => total + course.completedLessons, 0);
  const overallPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestão de Incidentes</span>
            <span className="text-xs text-slate-500">Ambiente do aluno</span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bem-vindo</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{user.email}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Utilize o painel abaixo para acessar os cursos liberados para sua conta. Todas as aulas e materiais so podem
            ser vistos apos entrar no curso.
          </p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700">
              <span>Progresso geral</span>
              <span>{overallPercentage}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${overallPercentage}%` }} />
            </div>
            <p className="text-xs text-slate-500">
              {completedLessons} de {totalLessons} aulas concluidas.
            </p>
          </div>
        </section>

        {role === "admin" ? (
          <section className="flex flex-col justify-between gap-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Acoes do admin</p>
              <h2 className="text-lg font-semibold text-slate-900">Cadastrar nova aula</h2>
              <p className="text-sm text-slate-600">
                Adicione aulas em modulos existentes. Apenas perfis com role admin conseguem acessar o formulario.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/aulas/nova"
                className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Cadastrar aula
              </Link>
              <Link
                href="/dashboard/aulas/nova?createModule=1&askCreateLesson=1"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Criar modulo
              </Link>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cursos</p>
            <h2 className="text-xl font-semibold text-slate-900">Conteudo disponivel</h2>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
              Nenhum curso cadastrado no momento. Assim que um curso estiver disponivel ele aparecera aqui.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Curso</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{course.title}</h3>
                  {course.description ? <p className="mt-2 flex-1 text-sm text-slate-600">{course.description}</p> : null}

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Progresso</span>
                      <span>{course.completionPercentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-sky-600 transition-all"
                        style={{ width: `${course.completionPercentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {course.completedLessons}/{course.totalLessons} aulas concluidas
                    </p>
                  </div>

                  <Link
                    href={`/curso/${course.slug}`}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                  >
                    Entrar no curso
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
