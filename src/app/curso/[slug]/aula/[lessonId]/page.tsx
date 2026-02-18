import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { LessonMaterials } from "@/components/course/lesson-materials";
import { LessonPlayer } from "@/components/course/lesson-player";
import { getLessonWithCourseContext } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Aula | Gestão de Incidentes",
};

type LessonPageProps = {
  params: Promise<{ slug: string; lessonId: string }>;
};

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug, lessonId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/curso/${slug}/aula/${lessonId}` });
    redirect(`/login?${search.toString()}`);
  }

  const context = await getLessonWithCourseContext(slug, lessonId, supabase);

  if (!context) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestǜo de Incidentes</span>
            <span className="text-xs text-slate-500">Conteúdo restrito</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/curso/${slug}`}
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Voltar para o curso
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <nav className="text-xs uppercase tracking-[0.2em] text-slate-500">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-900">
            Dashboard
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <Link href={`/curso/${slug}`} className="text-slate-500 hover:text-slate-900">
            {context.course.title}
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900">{context.lesson.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          <LessonPlayer lesson={context.lesson} />
          <LessonMaterials materials={context.lesson.materials} />
        </div>
      </main>
    </div>
  );
}
