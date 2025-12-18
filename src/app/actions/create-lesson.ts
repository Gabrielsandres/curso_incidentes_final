"use server";

import { redirect } from "next/navigation";

import { fetchUserRole } from "@/lib/auth/roles";
import { createLessonSchema } from "@/lib/lessons/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateLessonFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

type ModuleWithCourse = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  courses: { slug: string } | null;
};

export async function createLessonAction(
  _prevState: CreateLessonFormState,
  formData: FormData,
): Promise<CreateLessonFormState> {
  const parsed = createLessonSchema.safeParse({
    moduleId: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    videoUrl: formData.get("video_url"),
    position: formData.get("position"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on create lesson", error.message);
  }

  if (!user) {
    const search = new URLSearchParams({ redirectTo: "/dashboard/aulas/nova" });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    return {
      success: false,
      message: "Você não tem permissão para cadastrar aulas.",
    };
  }

  const { data: module, error: moduleError } = await supabase
    .from("modules")
    .select(
      `
        id,
        course_id,
        title,
        position,
        courses:course_id (
          slug
        )
      `,
    )
    .eq("id", parsed.data.moduleId)
    .maybeSingle();

  if (moduleError) {
    logger.error("Falha ao validar módulo para cadastro de aula", { error: moduleError.message });
  }

  if (!module) {
    return {
      success: false,
      message: "O módulo selecionado não existe mais.",
    };
  }

  const { error: insertError } = await supabase
    .from("lessons")
    .insert({
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      video_url: parsed.data.videoUrl,
      position: parsed.data.position,
    })
    .select("id")
    .single();

  if (insertError) {
    logger.error("Falha ao criar aula", insertError);
    const permissionDenied =
      insertError.code === "42501" || (insertError.message ?? "").toLowerCase().includes("permission denied");
    const networkFailure = (insertError.message ?? "").toLowerCase().includes("fetch failed");

    return {
      success: false,
      message: permissionDenied
        ? "Você não tem permissão para cadastrar aulas (RLS)."
        : networkFailure
          ? "Falha de conexão com o Supabase. Verifique a rede e tente novamente."
          : "Não foi possível salvar a aula. Tente novamente.",
    };
  }

  const moduleWithCourse = module as ModuleWithCourse;
  const courseSlug = moduleWithCourse.courses?.slug;

  if (courseSlug) {
    redirect(`/curso/${courseSlug}`);
  }

  redirect("/dashboard");
}
