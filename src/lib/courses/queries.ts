import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CourseRow,
  CourseSummary,
  CourseWithContent,
  LessonRow,
  LessonProgressStatus,
  LessonWithCourseContext,
  LessonWithMaterials,
  MaterialRow,
  ModuleRow,
  ModuleWithLessons,
  ModuleForLessonOption,
  ProgressStats,
} from "@/lib/courses/types";

type SupabaseServerClient = SupabaseClient<Database>;

type CourseQueryResult = CourseRow & {
  modules: (ModuleRow & {
    lessons: (LessonRow & { materials: MaterialRow[] | null })[] | null;
  })[] | null;
};

type CourseSummaryQueryResult = CourseRow & {
  modules: ({ lessons: Pick<LessonRow, "id">[] | null } & Pick<ModuleRow, "id">)[] | null;
};

type LessonQueryResult = LessonRow & {
  materials: MaterialRow[] | null;
};

type ModuleWithCourse = ModuleRow & {
  courses: { slug: string; title: string } | null;
};

type LessonProgressResult = Pick<
  Database["public"]["Tables"]["lesson_progress"]["Row"],
  "lesson_id" | "status" | "completed_at"
>;

async function resolveClient(client?: SupabaseServerClient) {
  if (client) {
    return client;
  }

  return createSupabaseServerClient();
}

function buildProgressStats(totalLessons: number, completedLessons: number): ProgressStats {
  const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  return { totalLessons, completedLessons, completionPercentage };
}

async function getLessonProgressByLessonId(
  supabase: SupabaseServerClient,
  userId: string | undefined,
  lessonIds: string[],
) {
  const progressMap = new Map<string, LessonProgressResult>();

  if (!userId || lessonIds.length === 0) {
    return progressMap;
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, status, completed_at")
    .eq("user_id", userId)
    .in("lesson_id", lessonIds);

  if (error) {
    logger.error("Falha ao carregar progresso das aulas", { userId, error: error.message });
    return progressMap;
  }

  const progressRows = (data as LessonProgressResult[] | null) ?? [];

  progressRows.forEach((progress) => {
    progressMap.set(progress.lesson_id, progress);
  });

  return progressMap;
}

export async function getAvailableCourses(client?: SupabaseServerClient, userId?: string): Promise<CourseSummary[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("courses")
    .select(
      `
        id,
        slug,
        title,
        description,
        cover_image_url,
        created_at,
        updated_at,
        modules (
          id,
          lessons (
            id
          )
        )
      `,
    )
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar cursos disponiveis", error.message);
    return [];
  }

  const courses = (data as CourseSummaryQueryResult[] | null) ?? [];
  const lessonsByCourse = courses.map((course) => ({
    course,
    lessonIds: (course.modules ?? []).flatMap((module) => (module.lessons ?? []).map((lesson) => lesson.id)),
  }));

  const uniqueLessonIds = Array.from(new Set(lessonsByCourse.flatMap((item) => item.lessonIds)));
  const progressByLessonId = await getLessonProgressByLessonId(supabase, userId, uniqueLessonIds);

  return lessonsByCourse.map(({ course, lessonIds }) => {
    const completedLessons = lessonIds.reduce((total, lessonId) => {
      const status = progressByLessonId.get(lessonId)?.status;
      return total + (status === "COMPLETED" ? 1 : 0);
    }, 0);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      cover_image_url: course.cover_image_url,
      created_at: course.created_at,
      updated_at: course.updated_at,
      ...buildProgressStats(lessonIds.length, completedLessons),
    };
  });
}

export async function getCourseWithContent(
  slug: string,
  client?: SupabaseServerClient,
  userId?: string,
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
        cover_image_url,
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
              description,
              source_kind,
              storage_bucket,
              storage_path,
              mime_type,
              file_size_bytes,
              original_file_name,
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

  const lessonIds = (course.modules ?? []).flatMap((module) => (module.lessons ?? []).map((lesson) => lesson.id));
  const progressByLessonId = await getLessonProgressByLessonId(supabase, userId, lessonIds);

  const modules = (course.modules ?? []).map((module) => ({
    ...module,
    lessons: (module.lessons ?? []).map((lesson) => ({
      ...lesson,
      materials: lesson.materials ?? [],
      progressStatus: (progressByLessonId.get(lesson.id)?.status ?? "NOT_STARTED") as LessonProgressStatus,
      completedAt: progressByLessonId.get(lesson.id)?.completed_at ?? null,
      isCompleted: progressByLessonId.get(lesson.id)?.status === "COMPLETED",
    })),
  })) as ModuleWithLessons[];

  const completedLessons = modules.reduce(
    (total, module) => total + module.lessons.reduce((moduleTotal, lesson) => moduleTotal + (lesson.isCompleted ? 1 : 0), 0),
    0,
  );

  return {
    ...course,
    modules,
    ...buildProgressStats(lessonIds.length, completedLessons),
  };
}

export async function getModulesForLessonForm(client?: SupabaseServerClient): Promise<ModuleForLessonOption[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("modules")
    .select(
      `
        id,
        course_id,
        title,
        description,
        position,
        courses:course_id (
          slug,
          title
        )
      `,
    )
    .order("created_at", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    logger.error("Falha ao carregar módulos para cadastro de aula", error.message);
    return [];
  }

  const modules = (data as ModuleWithCourse[] | null) ?? [];

  return modules.map((module) => ({
    id: module.id,
    title: module.title,
    position: module.position,
    courseId: module.course_id,
    courseSlug: module.courses?.slug ?? "",
    courseTitle: module.courses?.title ?? "",
  }));
}

export async function getLessonWithCourseContext(
  courseSlug: string,
  lessonId: string,
  client?: SupabaseServerClient,
  userId?: string,
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
          description,
          source_kind,
          storage_bucket,
          storage_path,
          mime_type,
          file_size_bytes,
          original_file_name,
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

  const lessonModule = moduleResponse.data as ModuleRow | null;
  const moduleError = moduleResponse.error;

  if (moduleError) {
    logger.error("Falha ao carregar módulo da aula", { lessonId, moduleId: lesson.module_id, error: moduleError.message });
  }

  if (!lessonModule) {
    return null;
  }

  const courseResponse = await supabase
    .from("courses")
    .select("id, slug, title, description, cover_image_url, created_at, updated_at")
    .eq("id", lessonModule.course_id)
    .eq("slug", courseSlug)
    .maybeSingle();

  const course = courseResponse.data as CourseRow | null;
  const courseError = courseResponse.error;

  if (courseError) {
    logger.error("Falha ao carregar curso vinculado a aula", {
      lessonId,
      moduleId: lessonModule.id,
      courseId: lessonModule.course_id,
      error: courseError.message,
    });
  }

  if (!course) {
    return null;
  }

  const lessonProgressByLessonId = await getLessonProgressByLessonId(supabase, userId, [lesson.id]);
  const lessonProgress = lessonProgressByLessonId.get(lesson.id);

  const normalizedLesson: LessonWithMaterials = {
    ...lesson,
    materials: lesson.materials ?? [],
    progressStatus: (lessonProgress?.status ?? "NOT_STARTED") as LessonProgressStatus,
    completedAt: lessonProgress?.completed_at ?? null,
    isCompleted: lessonProgress?.status === "COMPLETED",
  };

  return {
    course: {
      ...course,
      ...buildProgressStats(0, 0),
    },
    module: lessonModule,
    lesson: normalizedLesson,
  };
}
