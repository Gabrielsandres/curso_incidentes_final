import type { ModuleForLessonOption } from "@/lib/courses/types";

export type CreateModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
  moduleOption?: ModuleForLessonOption;
};
