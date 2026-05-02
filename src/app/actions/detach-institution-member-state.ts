// src/app/actions/detach-institution-member-state.ts
//
// Form state for detachInstitutionMemberAction (Plan 05-05).
// Same shape as AttachMemberFormState — consumed by DetachMemberButton in 05-07.

export type DetachMemberFormState = {
  success: boolean;
  message: string;
};

export const initialDetachMemberFormState: DetachMemberFormState = {
  success: false,
  message: "",
};
