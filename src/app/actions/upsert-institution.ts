"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fetchUserRole } from "@/lib/auth/roles";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  type CreateInstitutionInput,
} from "@/lib/institutions/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { InstitutionFormState } from "./upsert-institution-state";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on institution admin action",
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
      errorMessage: "Você não tem permissão para gerenciar instituições.",
    };
  }

  return { supabase, user, errorMessage: null as string | null };
}

function formatSupabaseInsertOrUpdateError(error: {
  code?: string | null;
  message?: string | null;
}): string {
  const permissionDenied =
    error.code === "42501" ||
    (error.message ?? "").toLowerCase().includes("permission denied");
  const uniqueViolation =
    error.code === "23505" ||
    (error.message ?? "").toLowerCase().includes("duplicate");

  if (permissionDenied) {
    return "Você não tem permissão para salvar instituições (RLS).";
  }
  if (uniqueViolation) {
    return "Já existe uma instituição com este slug. Escolha outro slug.";
  }
  return "Não foi possível salvar a instituição. Tente novamente.";
}

function revalidateInstitutionPages(slug?: string): void {
  revalidatePath("/admin");
  revalidatePath("/admin/instituicoes");
  if (slug) {
    revalidatePath(`/admin/instituicoes/${slug}`);
  }
  revalidatePath("/gestor");
}

// NOTE: The institutions table (migration 0013) currently has only
// { name, slug, contact_email } — there is no contact_phone column.
// See 05-03-SUMMARY.md and src/lib/institutions/schema.ts for context.
// `contact_email` is `string | null | undefined` after the schema's
// `.nullish()`; the Supabase Insert type accepts that union directly.
function buildInstitutionPayload(input: CreateInstitutionInput) {
  return {
    name: input.name,
    slug: input.slug,
    contact_email: input.contact_email ?? null,
  };
}

export async function createInstitutionAction(
  _prevState: InstitutionFormState,
  formData: FormData,
): Promise<InstitutionFormState> {
  const parsed = createInstitutionSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    contact_email: formData.get("contact_email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const { error } = await auth.supabase
    .from("institutions")
    .insert(buildInstitutionPayload(parsed.data))
    .select("id, slug")
    .single();

  if (error) {
    logger.error("Falha ao criar instituição", {
      slug: parsed.data.slug,
      error: error.message,
      code: error.code,
    });
    return { success: false, message: formatSupabaseInsertOrUpdateError(error) };
  }

  revalidateInstitutionPages(parsed.data.slug);

  // redirect() throws — execution stops here. The return below is unreachable,
  // but TypeScript needs it to satisfy the InstitutionFormState return type
  // in case redirect ever fails before throwing.
  redirect(`/admin/instituicoes/${parsed.data.slug}`);
}

export async function updateInstitutionAction(
  _prevState: InstitutionFormState,
  formData: FormData,
): Promise<InstitutionFormState> {
  const parsed = updateInstitutionSchema.safeParse({
    institutionId: formData.get("institutionId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    contact_email: formData.get("contact_email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Revise os dados informados.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const auth = await requireAdminUser();
  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const { institutionId, ...rest } = parsed.data;

  const { error } = await auth.supabase
    .from("institutions")
    .update(buildInstitutionPayload(rest))
    .eq("id", institutionId);

  if (error) {
    logger.error("Falha ao atualizar instituição", {
      institutionId,
      error: error.message,
      code: error.code,
    });
    return { success: false, message: formatSupabaseInsertOrUpdateError(error) };
  }

  revalidateInstitutionPages(parsed.data.slug);
  return { success: true, message: "Instituição atualizada." };
}
