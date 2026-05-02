// src/app/actions/promote-institution-manager-state.ts
//
// Form state for promoteInstitutionManagerAction + demoteInstitutionManagerAction
// (Plan 05-05). Both actions share the same shape — promote and demote are
// inverse operations against the same RPC family.

export type PromoteManagerFormState = {
  success: boolean;
  message: string;
};

export const initialPromoteManagerFormState: PromoteManagerFormState = {
  success: false,
  message: "",
};

// Reuse the same shape for the inverse action — alias for clarity at the call site.
export type DemoteManagerFormState = PromoteManagerFormState;

export const initialDemoteManagerFormState: DemoteManagerFormState = {
  success: false,
  message: "",
};
