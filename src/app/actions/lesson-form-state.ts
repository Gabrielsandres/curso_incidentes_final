export type LessonFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialLessonFormState: LessonFormState = { success: false, message: "" };
