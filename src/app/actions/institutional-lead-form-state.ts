export type InstitutionalLeadFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialInstitutionalLeadState: InstitutionalLeadFormState = {
  success: false,
  message: "",
};
