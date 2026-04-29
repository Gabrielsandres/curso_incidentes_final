export type ModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialModuleFormState: ModuleFormState = { success: false, message: "" };
