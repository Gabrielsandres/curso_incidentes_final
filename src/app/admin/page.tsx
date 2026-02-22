import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseManager } from "@/app/admin/course-manager";
import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin | Gestao de Incidentes",
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to load authenticated session", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/admin" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    redirect("/dashboard");
  }

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, slug, title, description, cover_image_url, created_at")
    .order("created_at", { ascending: true });

  if (coursesError) {
    console.error("Failed to load courses for admin page", coursesError.message);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-base font-semibold text-slate-900">Gestao de Incidentes</span>
            <span className="text-xs text-slate-500">Area restrita (admin)</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Voltar ao dashboard
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Area administrativa</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gerencie cursos, incluindo capa de destaque, sem depender de ajustes manuais no banco.
          </p>
        </div>

        <CourseManager courses={courses ?? []} />
      </main>
    </div>
  );
}
