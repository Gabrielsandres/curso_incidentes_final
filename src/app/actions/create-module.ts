"use server";

import { fetchUserRole } from "@/lib/auth/roles";
import type { ModuleForLessonOption } from "@/lib/courses/types";
import { logger } from "@/lib/logger";
import { createModuleSchema } from "@/lib/modules/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  moduleOption?: ModuleForLessonOption;
};

type CourseForModule = {
  id: string;
  slug: string;
  title: string;
};

export async function createModuleAction(
  _prevState: CreateModuleFormState,
  formData: FormData,
): Promise<CreateModuleFormState> {
  const parsed = createModuleSchema.safeParse({
    courseId: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description"),
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
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error("Falha ao carregar sessão autenticada no cadastro de módulo", userError.message);
  }

  if (!user) {
    return {
      success: false,
      message: "Sessão expirada. Atualize a página e tente novamente.",
    };
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return {
      success: false,
      message: "Você não tem permissão para criar módulos.",
    };
  }

  const { data: courseData, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title")
    .eq("id", parsed.data.courseId)
    .maybeSingle();

  if (courseError) {
    logger.error("Falha ao validar curso para cadastro de módulo", courseError.message);
  }

  const course = courseData as CourseForModule | null;
  if (!course) {
    return {
      success: false,
      message: "Curso não encontrado para criação do módulo.",
    };
  }

  let modulePosition = parsed.data.position;

  if (!modulePosition) {
    const { data: lastModuleData, error: lastModuleError } = await supabase
      .from("modules")
      .select("position")
      .eq("course_id", course.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastModuleError) {
      logger.warn("Falha ao buscar última posição de módulo. Usando posição inicial.", lastModuleError.message);
    }

    modulePosition = (lastModuleData?.position ?? 0) + 1;
  }

  const { data: insertedModule, error: insertError } = await supabase
    .from("modules")
    .insert({
      course_id: course.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      position: modulePosition,
    })
    .select("id, title, course_id, position")
    .single();

  if (insertError) {
    logger.error("Falha ao criar módulo", insertError);
    const permissionDenied =
      insertError.code === "42501" || (insertError.message ?? "").toLowerCase().includes("permission denied");
    const networkFailure = (insertError.message ?? "").toLowerCase().includes("fetch failed");
    const details = [insertError.message, insertError.details, insertError.hint].filter(Boolean).join(" | ");
    const devSuffix = process.env.NODE_ENV === "development" && details ? ` Detalhes: ${details}` : "";

    return {
      success: false,
      message: permissionDenied
        ? `Você não tem permissão para criar módulos (RLS).${devSuffix}`
        : networkFailure
          ? `Falha de conexão com o Supabase. Verifique a rede e tente novamente.${devSuffix}`
          : `Não foi possível criar o módulo. Tente novamente.${devSuffix}`,
    };
  }

  return {
    success: true,
    message: "Módulo criado com sucesso.",
    moduleOption: {
      id: insertedModule.id,
      title: insertedModule.title,
      position: insertedModule.position,
      courseId: insertedModule.course_id,
      courseSlug: course.slug,
      courseTitle: course.title,
    },
  };
}
