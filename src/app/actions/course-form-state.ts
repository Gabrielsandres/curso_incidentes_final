export type CourseFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialCourseFormState: CourseFormState = {
  success: false,
  message: "",
};
