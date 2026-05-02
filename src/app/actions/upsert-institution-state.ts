// src/app/actions/upsert-institution-state.ts
//
// Form state shape consumed by useActionState in the admin institution
// create/update forms (Plan 05-07). Mirrors CourseFormState from
// course-form-state.ts — same `success` + `message` + optional `fieldErrors`.

export type InstitutionFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialInstitutionFormState: InstitutionFormState = {
  success: false,
  message: "",
};
