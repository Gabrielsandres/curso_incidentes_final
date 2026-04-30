"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EnrollmentFormState } from "./grant-enrollment-state";

export type { EnrollmentFormState };

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on admin action", error.message);
  }

  if (!user) {
    return {
      supabase,
      user: null as null,
      errorMessage: "Sessão expirada. Atualize a página e tente novamente.",
    };
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return {
      supabase,
      user: null as null,
      errorMessage: "Você não tem permissão para gerenciar acessos.",
    };
  }

  return { supabase, user, errorMessage: null as string | null };
}

export async function grantEnrollmentBatchAction(
  _prevState: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const userIds = formData.getAll("user_ids[]").map((v) => String(v).trim()).filter(Boolean);
  const courseId = String(formData.get("course_id") ?? "").trim();
  const courseSlug = String(formData.get("course_slug") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (userIds.length === 0 || !courseId) {
    return { success: false, message: "Selecione pelo menos um aluno." };
  }

  const adminClient = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const rows = userIds.map((userId) => ({
    user_id: userId,
    course_id: courseId,
    source: "admin_grant" as const,
    granted_at: now,
    expires_at: expiresAt,
  }));

  const { error } = await adminClient
    .from("enrollments")
    .upsert(rows, { onConflict: "user_id,course_id", ignoreDuplicates: true });

  if (error) {
    logger.error("Falha ao conceder acesso em lote", { courseId, error: error.message });
    captureException(new Error("Supabase upsert error (enrollments batch)"), {
      extra: { message: error.message, code: error.code },
    });
    return { success: false, message: "Não foi possível conceder acesso. Tente novamente." };
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return {
    success: true,
    grantedCount: userIds.length,
    message: `Acesso concedido para ${userIds.length} aluno${userIds.length !== 1 ? "s" : ""}.`,
  };
}

export async function grantEnrollmentWithInviteAction(
  _prevState: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const rawEmail = String(formData.get("email") ?? "").trim();
  const email = rawEmail.toLowerCase();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const courseSlug = String(formData.get("course_slug") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!email || !courseId) {
    return { success: false, message: "Dados inválidos. Tente novamente." };
  }

  const adminClient = createSupabaseAdminClient();

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { invited_from: "admin_grant" },
  });

  if (inviteError) {
    logger.error("Falha ao enviar convite", { email, error: inviteError.message });
    captureException(new Error("Supabase invite error"), {
      extra: { message: inviteError.message },
    });
    return { success: false, message: "Não foi possível enviar o convite. Tente novamente." };
  }

  const { error: pendingError } = await adminClient.from("pending_enrollments").insert({
    email,
    course_id: courseId,
    invited_by: auth.user!.id,
    expires_at: expiresAt,
  });

  if (pendingError) {
    logger.error("Falha ao registrar pending_enrollment", { email, courseId, error: pendingError.message });
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return {
    success: true,
    pendingInviteSent: true,
    message: "Convite enviado. O acesso será ativado quando o aluno aceitar.",
  };
}
