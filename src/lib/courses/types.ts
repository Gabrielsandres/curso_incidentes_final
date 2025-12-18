import type { Database } from "@/lib/database.types";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];

export type CourseSummary = CourseRow;

export type LessonWithMaterials = LessonRow & {
  materials: MaterialRow[];
};

export type ModuleWithLessons = ModuleRow & {
  lessons: LessonWithMaterials[];
};

export type ModuleForLessonOption = {
  id: string;
  title: string;
  position: number;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
};

export type CourseWithContent = CourseRow & {
  modules: ModuleWithLessons[];
};

export type LessonWithCourseContext = {
  course: CourseRow;
  module: ModuleRow;
  lesson: LessonWithMaterials;
};
