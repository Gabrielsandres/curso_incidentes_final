import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlayCircle } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminModuleWithLessons } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ModuleEditForm } from "./module-edit-form";
import { LessonReorderRow } from "./lesson-reorder-row";
import { AddLessonForm } from "./add-lesson-form";

export const metadata: Metadata = {
  title: "Editar módulo | Admin — Gestão de Incidentes",
};

function formatWorkload(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  return `${minutes} min`;
}

export default async function ModuleEditPage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on module edit page", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/admin/cursos/${slug}/modulos/${moduleId}` });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const moduleData = await getAdminModuleWithLessons(moduleId, supabase);
  if (!moduleData) {
    notFound();
  }

  // Get course title for breadcrumb via module.course_id
  const { data: courseData } = await supabase
    .from("courses")
    .select("id, slug, title")
    .eq("id", moduleData.course_id)
    .maybeSingle();

  const courseTitle = courseData?.title ?? slug;
  const courseSlug = courseData?.slug ?? slug;

  const lessons = moduleData.lessons ?? [];

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
          <Breadcrumb
            items={[
              { label: "Catálogo", href: "/admin/cursos" },
              { label: courseTitle, href: `/admin/cursos/${courseSlug}` },
              { label: moduleData.title },
            ]}
          />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{moduleData.title}</h1>
        </div>

        {/* Module details card */}
        <ModuleEditForm module={moduleData} courseSlug={courseSlug} />

        {/* Lessons card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">CONTEÚDO</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Aulas do módulo</h2>
            </div>
          </div>

          <div className="mt-4">
            <AddLessonForm moduleId={moduleId} courseSlug={courseSlug} />
          </div>

          {lessons.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center flex flex-col items-center gap-3">
              <PlayCircle size={32} className="text-slate-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma aula neste módulo</p>
              <p className="text-sm text-slate-500">Adicione a primeira aula deste módulo.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {lessons.map((lesson, index) => (
                <LessonReorderRow
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === lessons.length - 1}
                  courseSlug={courseSlug}
                  workloadDisplay={lesson.workload_minutes ? formatWorkload(lesson.workload_minutes) : ""}
                />
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href={`/admin/cursos/${courseSlug}`}
            className="text-sky-600 hover:text-sky-700 transition"
          >
            ← Voltar para {courseTitle}
          </Link>
        </div>
      </main>
    </div>
  );
}
