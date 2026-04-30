export type EnrollmentFormState = {
  success: boolean;
  message: string;
  grantedCount?: number;
  pendingInviteSent?: boolean;
};

export const initialEnrollmentState: EnrollmentFormState = { success: false, message: "" };
