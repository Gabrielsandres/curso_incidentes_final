"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type EnrollmentFormState = {
  success: boolean;
  message: string;
  foundProfile?: { id: string; fullName: string; email: string } | null;
  pendingInviteSent?: boolean;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialEnrollmentState: EnrollmentFormState = { success: false, message: "" };

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

export async function lookupProfileByEmailAction(
  _prevState: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const rawEmail = String(formData.get("email") ?? "").trim();
  if (!rawEmail) {
    return { success: false, message: "Informe um email.", fieldErrors: { email: ["Email obrigatório."] } };
  }

  const email = rawEmail.toLowerCase();

  const adminClient = createSupabaseAdminClient();

  // profiles table does not store email — look up via auth.admin.listUsers filtered by email
  const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    logger.error("Falha ao listar usuários para lookup por email", { email, error: listError.message });
    captureException(new Error("Supabase auth.admin.listUsers error"), {
      extra: { message: listError.message },
    });
    return { success: false, message: "Não foi possível buscar o aluno. Tente novamente." };
  }

  const authUser = usersData.users.find((u) => u.email?.toLowerCase() === email);

  if (!authUser) {
    return { success: false, message: "", foundProfile: null };
  }

  // Fetch profile for this auth user
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .eq("id", authUser.id)
    .maybeSingle();

  if (profileError) {
    logger.error("Falha ao buscar perfil por id", { userId: authUser.id, error: profileError.message });
    return { success: false, message: "Não foi possível buscar o aluno. Tente novamente." };
  }

  if (!profile) {
    // Auth user exists but no profile yet (race condition — treat as not found)
    return { success: false, message: "", foundProfile: null };
  }

  return {
    success: true,
    message: "",
    foundProfile: {
      id: profile.id,
      fullName: profile.full_name,
      email,
    },
  };
}

export async function grantEnrollmentAction(
  _prevState: EnrollmentFormState,
  formData: FormData,
): Promise<EnrollmentFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const userId = String(formData.get("user_id") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const courseSlug = String(formData.get("course_slug") ?? "").trim();
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;

  if (!userId || !courseId) {
    return { success: false, message: "Dados inválidos. Tente novamente." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("enrollments").insert({
    user_id: userId,
    course_id: courseId,
    source: "admin_grant",
    granted_at: new Date().toISOString(),
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "Este aluno já tem acesso ativo a este curso." };
    }
    logger.error("Falha ao conceder acesso ao curso", { userId, courseId, error: error.message });
    captureException(new Error("Supabase insert error (enrollments)"), {
      extra: { message: error.message, code: error.code },
    });
    return { success: false, message: "Não foi possível conceder acesso. Tente novamente." };
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return { success: true, message: "Acesso concedido com sucesso." };
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
