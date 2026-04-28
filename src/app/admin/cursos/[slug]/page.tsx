import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Layers, PlayCircle } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { deriveCourseStatus } from "@/components/admin/status-badge";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminCourseBySlug } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CourseEditForm } from "./course-edit-form";
import { ModuleReorderRow } from "./module-reorder-row";
import { AddModuleForm } from "./add-module-form";

export const metadata: Metadata = {
  title: "Editar curso | Admin — Gestão de Incidentes",
};

export default async function CourseEditPage({
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
    logger.error("Failed to load authenticated session on course edit page", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/admin/cursos/${slug}` });
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

  const status = deriveCourseStatus(course.published_at, course.archived_at);
  const activeModules = (course.modules ?? []).filter((m) => !m.deleted_at);

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
              { label: course.title },
            ]}
          />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{course.title}</h1>
        </div>

        {/* Course details card */}
        <CourseEditForm course={course} status={status} />

        {/* Modules card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">ESTRUTURA</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Módulos</h2>
            </div>
          </div>

          <div className="mt-4">
            <AddModuleForm courseId={course.id} courseSlug={slug} />
          </div>

          {activeModules.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center flex flex-col items-center gap-3">
              <Layers size={32} className="text-slate-400" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-700">Nenhum módulo criado</p>
              <p className="text-sm text-slate-500">Adicione módulos para organizar as aulas.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {activeModules.map((module, index) => {
                const lessonCount = (module.lessons ?? []).filter((l) => !l.deleted_at).length;
                return (
                  <ModuleReorderRow
                    key={module.id}
                    module={module}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === activeModules.length - 1}
                    lessonCount={lessonCount}
                    courseSlug={slug}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Quick link to lessons */}
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <PlayCircle size={16} aria-hidden="true" />
          <span>Para editar aulas, acesse a página de edição de cada módulo.</span>
        </div>
      </main>
    </div>
  );
}
