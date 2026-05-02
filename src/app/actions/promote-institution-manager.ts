"use server";

import { captureException } from "@sentry/nextjs";
import { revalidatePath } from "next/cache";

import { fetchUserRole } from "@/lib/auth/roles";
import {
  promoteManagerSchema,
  demoteManagerSchema,
} from "@/lib/institutions/schema";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  PromoteManagerFormState,
  DemoteManagerFormState,
} from "./promote-institution-manager-state";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on promote/demote action",
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
      errorMessage: "Você não tem permissão para gerenciar gestores.",
    };
  }

  return { supabase, user, errorMessage: null as string | null };
}

function revalidateAfterRoleChange(slug: string): void {
  revalidatePath("/admin/instituicoes");
  revalidatePath(`/admin/instituicoes/${slug}`);
  revalidatePath("/gestor");
  // Role change flips the user's dashboard nav (student ↔ manager landing) —
  // invalidate so the next request re-renders with the right shell.
  revalidatePath("/dashboard");
}

export async function promoteInstitutionManagerAction(
  _prevState: PromoteManagerFormState,
  formData: FormData,
): Promise<PromoteManagerFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const parsed = promoteManagerSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const adminClient = createSupabaseAdminClient();

  // ATOMIC: PostgREST wraps the RPC in a single transaction.
  // RPC promote_institution_manager (migration 0014) handles, in one txn:
  //   1. Find the prior manager (if any) of this institution.
  //   2. Update profiles.role + institution_members.role for the new manager.
  //   3. Demote the prior manager in this institution (auto-demote per D-07:
  //      "uma instituição = um gestor por vez").
  //   4. If the prior manager has no other manager seats globally, reset
  //      their profiles.role back to 'student'.
  // Any failure inside the function rolls back the entire transaction —
  // there is NO partial state. This is why we MUST NOT inline sequential
  // admin-client UPDATEs here (Pitfall 3).
  const { error } = await adminClient.rpc("promote_institution_manager", {
    p_institution_id: parsed.data.institution_id,
    p_new_manager_profile_id: parsed.data.profile_id,
  });

  if (error) {
    logger.error("Falha ao promover gestor", {
      institution_id: parsed.data.institution_id,
      profile_id: parsed.data.profile_id,
      error: error.message,
      code: error.code,
    });
    captureException(new Error("promote_institution_manager RPC failed"), {
      extra: { message: error.message, code: error.code },
    });
    return {
      success: false,
      message:
        "Não foi possível promover o aluno a gestor. Atualize a página e tente novamente.",
    };
  }

  revalidateAfterRoleChange(parsed.data.institution_slug);
  return { success: true, message: "Aluno promovido a gestor." };
}

export async function demoteInstitutionManagerAction(
  _prevState: DemoteManagerFormState,
  formData: FormData,
): Promise<DemoteManagerFormState> {
  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const parsed = demoteManagerSchema.safeParse({
    institution_id: formData.get("institution_id"),
    profile_id: formData.get("profile_id"),
    institution_slug: formData.get("institution_slug"),
  });
  if (!parsed.success) {
    return { success: false, message: "Dados inválidos." };
  }

  const adminClient = createSupabaseAdminClient();

  // ATOMIC: same justification as promote — RPC wraps the demote sequence
  // in one transaction. RPC demote_institution_manager (migration 0014):
  //   1. Sets institution_members.role = 'student' for this user in this institution.
  //   2. If the user has no other manager seats globally, resets profiles.role
  //      back to 'student'.
  const { error } = await adminClient.rpc("demote_institution_manager", {
    p_institution_id: parsed.data.institution_id,
    p_profile_id: parsed.data.profile_id,
  });

  if (error) {
    logger.error("Falha ao rebaixar gestor", {
      institution_id: parsed.data.institution_id,
      profile_id: parsed.data.profile_id,
      error: error.message,
      code: error.code,
    });
    captureException(new Error("demote_institution_manager RPC failed"), {
      extra: { message: error.message, code: error.code },
    });
    return {
      success: false,
      message:
        "Não foi possível rebaixar o gestor. Atualize a página e tente novamente.",
    };
  }

  revalidateAfterRoleChange(parsed.data.institution_slug);
  return { success: true, message: "Gestor rebaixado a aluno." };
}
