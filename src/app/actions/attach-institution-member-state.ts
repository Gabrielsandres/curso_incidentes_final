// src/app/actions/attach-institution-member-state.ts
//
// Form state for attachInstitutionMemberAction (Plan 05-05).
// No fieldErrors — input comes programmatically from clicking on a search
// result, not from a free-form input the user can mistype.

export type AttachMemberFormState = {
  success: boolean;
  message: string;
};

export const initialAttachMemberFormState: AttachMemberFormState = {
  success: false,
  message: "",
};
