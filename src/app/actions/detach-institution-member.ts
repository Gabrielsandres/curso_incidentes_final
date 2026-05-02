"use server";

import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { detachMemberSchema } from "@/lib/institutions/schema";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { DetachMemberFormState } from "./detach-institution-member-state";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on detach-member action",
      error.message,
    );
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
      errorMessage: "Você não tem permissão para gerenciar membros de instituição.",
    };
  }

  return { supabase, user, errorMessage: null as string | null };
}

export async function detachInstitutionMemberAction(
  _prevState: DetachMemberFormState,
  formData: FormData,
): Promise<DetachMemberFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const parsed = detachMemberSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const adminClient = createSupabaseAdminClient();

  // D-08: SOFT DETACH — only remove the membership row.
  // enrollments and course_certificates are PRESERVED (history is sacred per
  // CERT-05 spirit). RLS revokes manager visibility of this user's progress
  // immediately after this delete, but the user keeps access to courses they
  // were already enrolled in and any certificates they earned.
  const { error } = await adminClient
    .from("institution_members")
    .delete()
    .eq("institution_id", parsed.data.institution_id)
    .eq("profile_id", parsed.data.profile_id);

  if (error) {
    logger.error("Falha ao desvincular aluno", {
      institution_id: parsed.data.institution_id,
      profile_id: parsed.data.profile_id,
      error: error.message,
      code: error.code,
    });
    return {
      success: false,
      message: "Não foi possível desvincular o aluno. Tente novamente.",
    };
  }

  revalidatePath(`/admin/instituicoes/${parsed.data.institution_slug}`);
  revalidatePath("/gestor");
  return { success: true, message: "Aluno desvinculado." };
}
