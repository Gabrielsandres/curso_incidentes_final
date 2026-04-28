"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchUserRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { deleteModuleSchema, reorderModuleSchema, updateModuleSchema } from "@/lib/modules/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ModuleFormState = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialModuleFormState: ModuleFormState = { success: false, message: "" };

async function requireAdminUser() {
  const supabase: SupabaseClient<Database> = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Falha ao carregar sessao no modulo admin", error.message);
  }

  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessão expirada. Atualize a página e tente novamente." };
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Você não tem permissão para gerenciar módulos." };
  }

  return { supabase, user, errorMessage: null as string | null };
}

export async function updateModuleAction(
  _prevState: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = updateModuleSchema.safeParse({
    moduleId: formData.get("module_id"),
    title: formData.get("title"),
    description: formData.get("description"),
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
    .from("modules")
    .update({ title: parsed.data.title, description: parsed.data.description })
    .eq("id", parsed.data.moduleId);

  if (error) {
    logger.error("Falha ao atualizar módulo", { error: error.message });
    return { success: false, message: "Não foi possível salvar o módulo. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Módulo atualizado com sucesso." };
}

export async function deleteModuleAction(
  _prevState: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = deleteModuleSchema.safeParse({ moduleId: formData.get("module_id") });

  if (!parsed.success) {
    return { success: false, message: "Módulo inválido." };
  }

  const auth = await requireAdminUser();

  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  // Soft delete — preserve lesson_progress history (D-02)
  const { error } = await auth.supabase
    .from("modules")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.moduleId);

  if (error) {
    logger.error("Falha ao arquivar módulo", { error: error.message });
    return { success: false, message: "Não foi possível arquivar o módulo. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Módulo arquivado. Histórico de progresso de alunos preservado." };
}

export async function reorderModuleAction(
  _prevState: ModuleFormState,
  formData: FormData,
): Promise<ModuleFormState> {
  const parsed = reorderModuleSchema.safeParse({
    moduleId: formData.get("module_id"),
    direction: formData.get("direction"),
  });

  if (!parsed.success) {
    return { success: false, message: "Dados de reordenação inválidos." };
  }

  const auth = await requireAdminUser();

  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const { moduleId, direction } = parsed.data;

  // Read current module position and course_id
  const { data: current, error: readError } = await auth.supabase
    .from("modules")
    .select("position, course_id")
    .eq("id", moduleId)
    .single();

  if (readError || !current) {
    return { success: false, message: "Módulo não encontrado." };
  }

  const neighborPosition = direction === "up" ? current.position - 1 : current.position + 1;

  // Find neighbor (only non-deleted modules)
  const { data: neighbor } = await auth.supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", current.course_id)
    .eq("position", neighborPosition)
    .is("deleted_at", null)
    .maybeSingle();

  if (!neighbor) {
    return { success: false, message: "Não é possível mover além do limite." };
  }

  // Swap positions — sequential (NOT atomic); accept-low-severity per T-02-T6
  const { error: e1 } = await auth.supabase
    .from("modules")
    .update({ position: neighborPosition })
    .eq("id", moduleId);

  const { error: e2 } = await auth.supabase
    .from("modules")
    .update({ position: current.position })
    .eq("id", neighbor.id);

  if (e1 ?? e2) {
    logger.error("Falha ao reordenar módulos", { e1: e1?.message, e2: e2?.message });
    return { success: false, message: "Não foi possível reordenar. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Ordem atualizada." };
}
