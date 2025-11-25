import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getAvailableCourses } from "@/lib/courses/queries";
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
    const search = new URLSearchParams({ redirectTo: "/dashboard" });
    redirect(`/login?${search.toString()}`);
  }

  const courses = await getAvailableCourses(supabase);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestǜo de Incidentes</span>
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
            Utilize o painel abaixo para acessar os cursos liberados para sua conta. Todas as aulas e materiais só podem
            ser vistos após entrar no curso.
          </p>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Cursos</p>
            <h2 className="text-xl font-semibold text-slate-900">Conteúdo disponível</h2>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
              Nenhum curso cadastrado no momento. Assim que um curso estiver disponível ele aparecerá aqui.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <article key={course.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Curso</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{course.title}</h3>
                  {course.description ? <p className="mt-2 flex-1 text-sm text-slate-600">{course.description}</p> : null}
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
