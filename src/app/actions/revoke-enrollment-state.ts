export type RevokeEnrollmentState = {
  success: boolean;
  message: string;
};

export const initialRevokeState: RevokeEnrollmentState = { success: false, message: "" };
