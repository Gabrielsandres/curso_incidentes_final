"use server";

import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export type RevokeEnrollmentState = {
  success: boolean;
  message: string;
};

export const initialRevokeState: RevokeEnrollmentState = { success: false, message: "" };

export async function revokeEnrollmentAction(
  _prevState: RevokeEnrollmentState,
  formData: FormData,
): Promise<RevokeEnrollmentState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const courseSlug = String(formData.get("course_slug") ?? "").trim();

  if (!enrollmentId) {
    return { success: false, message: "Identificador de matrícula inválido." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("enrollments").delete().eq("id", enrollmentId);

  if (error) {
    logger.error("Falha ao revogar acesso", { enrollmentId, error: error.message });
    return { success: false, message: "Não foi possível revogar o acesso. Tente novamente." };
  }

  revalidatePath(`/admin/cursos/${courseSlug}/alunos`);
  return { success: true, message: "Acesso revogado com sucesso." };
}
