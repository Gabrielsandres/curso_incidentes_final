import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CourseRow,
  CourseSummary,
  CourseWithContent,
  LessonRow,
  LessonWithCourseContext,
  LessonWithMaterials,
  MaterialRow,
  ModuleRow,
  ModuleWithLessons,
} from "@/lib/courses/types";

type SupabaseServerClient = SupabaseClient<Database>;

type CourseQueryResult = CourseRow & {
  modules: (ModuleRow & {
    lessons: (LessonRow & { materials: MaterialRow[] | null })[] | null;
  })[] | null;
};

type LessonQueryResult = LessonRow & {
  materials: MaterialRow[] | null;
};

async function resolveClient(client?: SupabaseServerClient) {
  if (client) {
    return client;
  }

  return createSupabaseServerClient();
}

export async function getAvailableCourses(client?: SupabaseServerClient): Promise<CourseSummary[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, description, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar cursos disponiveis", error.message);
    return [];
  }

  return data ?? [];
}

export async function getCourseWithContent(
  slug: string,
  client?: SupabaseServerClient,
): Promise<CourseWithContent | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        id,
        slug,
        title,
        description,
        created_at,
        updated_at,
        modules (
          id,
          course_id,
          title,
          description,
          position,
          created_at,
          lessons (
            id,
            module_id,
            title,
            description,
            video_url,
            position,
            created_at,
            materials (
              id,
              lesson_id,
              label,
              material_type,
              resource_url,
              created_at
            )
          )
        )
      `,
    )
    .eq("slug", slug)
    .order("position", { foreignTable: "modules", ascending: true })
    .order("position", { foreignTable: "modules.lessons", ascending: true })
    .maybeSingle();

  if (error) {
    logger.error("Falha ao carregar curso por slug", { slug, error: error.message });
    return null;
  }

  const course = data as CourseQueryResult | null;

  if (!course) {
    return null;
  }

  const modules = (course.modules ?? []).map((module) => ({
    ...module,
    lessons: (module.lessons ?? []).map((lesson) => ({
      ...lesson,
      materials: lesson.materials ?? [],
    })),
  })) as ModuleWithLessons[];

  return {
    ...course,
    modules,
  };
}

export async function getLessonWithCourseContext(
  courseSlug: string,
  lessonId: string,
  client?: SupabaseServerClient,
): Promise<LessonWithCourseContext | null> {
  const supabase = await resolveClient(client);
  const {
    data: lessonData,
    error: lessonError,
  } = await supabase
    .from("lessons")
    .select(
      `
        id,
        module_id,
        title,
        description,
        video_url,
        position,
        created_at,
        materials (
          id,
          lesson_id,
          label,
          material_type,
          resource_url,
          created_at
        )
      `,
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error("Falha ao carregar detalhes da aula", { lessonId, error: lessonError.message });
  }

  const lesson = lessonData as LessonQueryResult | null;

  if (!lesson) {
    return null;
  }

  const moduleResponse = await supabase
    .from("modules")
    .select("id, course_id, title, description, position, created_at")
    .eq("id", lesson.module_id)
    .maybeSingle();

  const module = moduleResponse.data as ModuleRow | null;
  const moduleError = moduleResponse.error;

  if (moduleError) {
    logger.error("Falha ao carregar modulo da aula", { lessonId, moduleId: lesson.module_id, error: moduleError.message });
  }

  if (!module) {
    return null;
  }

  const courseResponse = await supabase
    .from("courses")
    .select("id, slug, title, description, created_at, updated_at")
    .eq("id", module.course_id)
    .eq("slug", courseSlug)
    .maybeSingle();

  const course = courseResponse.data as CourseSummary | null;
  const courseError = courseResponse.error;

  if (courseError) {
    logger.error("Falha ao carregar curso vinculado a aula", {
      lessonId,
      moduleId: module.id,
      courseId: module.course_id,
      error: courseError.message,
    });
  }

  if (!course) {
    return null;
  }

  const normalizedLesson: LessonWithMaterials = {
    ...lesson,
    materials: lesson.materials ?? [],
  };

  return {
    course,
    module,
    lesson: normalizedLesson,
  };
}
