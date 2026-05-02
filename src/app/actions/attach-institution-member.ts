"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import { attachMemberSchema } from "@/lib/institutions/schema";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { AttachMemberFormState } from "./attach-institution-member-state";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on attach-member action",
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

export async function attachInstitutionMemberAction(
  _prevState: AttachMemberFormState,
  formData: FormData,
): Promise<AttachMemberFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const parsed = attachMemberSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos. Selecione um aluno válido." };
  }

  const adminClient = createSupabaseAdminClient();

  // Idempotent on duplicate (admin clicks twice / navigates back) — onConflict
  // ignores the row when (institution_id, profile_id) already exists.
  const { error } = await adminClient.from("institution_members").upsert(
    {
      institution_id: parsed.data.institution_id,
      profile_id: parsed.data.profile_id,
      role: "student",
    },
    { onConflict: "institution_id,profile_id", ignoreDuplicates: true },
  );

  if (error) {
    logger.error("Falha ao vincular aluno à instituição", {
      institution_id: parsed.data.institution_id,
      profile_id: parsed.data.profile_id,
      error: error.message,
      code: error.code,
    });
    captureException(new Error("attach institution member upsert failed"), {
      extra: { message: error.message, code: error.code },
    });
    return {
      success: false,
      message: "Não foi possível vincular o aluno. Tente novamente.",
    };
  }

  revalidatePath(`/admin/instituicoes/${parsed.data.institution_slug}`);
  revalidatePath("/gestor");
  return { success: true, message: "Aluno vinculado." };
}
