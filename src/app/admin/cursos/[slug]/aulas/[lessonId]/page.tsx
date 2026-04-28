import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, Paperclip } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { MaterialUpload } from "@/components/admin/material-upload";
import { fetchUserRole } from "@/lib/auth/roles";
import { getAdminLessonWithContext } from "@/lib/courses/queries";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LessonEditForm } from "./lesson-edit-form";
import { LessonRestoreButton } from "./lesson-restore-button";
import { MaterialListItem } from "./material-list-item";

export const metadata: Metadata = {
  title: "Editar aula | Admin — Gestão de Incidentes",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function LessonEditPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on lesson edit page", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: `/admin/cursos/${slug}/aulas/${lessonId}` });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const context = await getAdminLessonWithContext(lessonId, supabase);
  if (!context) {
    notFound();
  }

  const { lesson, module: lessonModule } = context;
  const courseTitle = lessonModule.courses?.title ?? slug;
  const courseSlug = lessonModule.courses?.slug ?? slug;
  const isRemoved = Boolean(lesson.deleted_at);
  const isProduction = process.env.NODE_ENV === "production";

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
              {
                label: lessonModule.title,
                href: `/admin/cursos/${courseSlug}/modulos/${lessonModule.id}`,
              },
              { label: lesson.title },
            ]}
          />
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">{lesson.title}</h1>
        </div>

        {/* Removed banner */}
        {isRemoved && lesson.deleted_at && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Esta aula foi removida</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Removida em {formatDate(lesson.deleted_at)}. O histórico de progresso dos alunos é preservado.
              </p>
            </div>
            <LessonRestoreButton lessonId={lesson.id} />
          </div>
        )}

        {/* Lesson details card */}
        <LessonEditForm lesson={lesson} isProduction={isProduction} />

        {/* Materials card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            MATERIAIS DE APOIO
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Materiais da aula</h2>

          <div className="mt-4">
            {lesson.materials.length === 0 ? (
              <div className="mb-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center flex flex-col items-center gap-3">
                <Paperclip size={32} className="text-slate-400" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700">Nenhum material anexado</p>
                <p className="text-sm text-slate-500">
                  Faça upload de PDFs, planilhas ou imagens de apoio.
                </p>
              </div>
            ) : (
              <ul className="mb-4 divide-y divide-slate-100">
                {lesson.materials.map((material) => (
                  <MaterialListItem
                    key={material.id}
                    material={material}
                    sizeDisplay={formatFileSize(material.file_size_bytes)}
                  />
                ))}
              </ul>
            )}
            <MaterialUpload lessonId={lesson.id} />
          </div>
        </section>

        <div className="text-sm">
          <Link
            href={`/admin/cursos/${courseSlug}/modulos/${lessonModule.id}`}
            className="text-sky-600 hover:text-sky-700 transition"
          >
            ← Voltar para {lessonModule.title}
          </Link>
        </div>
      </main>
    </div>
  );
}
