import type { Database } from "@/lib/database.types";

export type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type LessonRow = Database["public"]["Tables"]["lessons"]["Row"];
export type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];
export type MaterialSourceKind = "LINK" | "UPLOAD";
export type LessonProgressStatus = Database["public"]["Enums"]["lesson_progress_status"];

export type ProgressStats = {
  totalLessons: number;
  completedLessons: number;
  completionPercentage: number;
};

export type CourseSummary = CourseRow & ProgressStats;

export type LessonWithMaterials = LessonRow & {
  materials: MaterialRow[];
  progressStatus: LessonProgressStatus;
  completedAt: string | null;
  isCompleted: boolean;
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
} & ProgressStats;

export type LessonWithCourseContext = {
  course: CourseSummary;
  module: ModuleRow;
  lesson: LessonWithMaterials;
};
