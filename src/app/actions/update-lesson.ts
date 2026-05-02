"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { LessonFormState } from "@/app/actions/lesson-form-state";
import { fetchUserRole } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";
import { deleteLessonSchema, reorderLessonSchema, restoreLessonSchema, updateLessonSchema } from "@/lib/lessons/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// LessonFormState type and initialLessonFormState are exported from
// `@/app/actions/lesson-form-state` to satisfy Next.js "use server" rule
// (server action files can only export async functions).

async function requireAdminUser() {
  const supabase: SupabaseClient<Database> = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Falha ao carregar sessao nas acoes de aula admin", error.message);
  }

  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessão expirada. Atualize a página e tente novamente." };
  }

  const role = await fetchUserRole(supabase, user.id);

  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Você não tem permissão para gerenciar aulas." };
  }

  return { supabase, user, errorMessage: null as string | null };
}

export async function updateLessonAction(
  _prevState: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const parsed = updateLessonSchema.safeParse({
    lessonId: formData.get("lesson_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    videoProvider: formData.get("video_provider"),
    videoExternalId: formData.get("video_external_id"),
    workloadMinutes: formData.get("workload_minutes"),
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
    .from("lessons")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      video_provider: parsed.data.videoProvider,
      video_external_id: parsed.data.videoExternalId,
      workload_minutes: parsed.data.workloadMinutes ?? null,
    })
    .eq("id", parsed.data.lessonId);

  if (error) {
    logger.error("Falha ao atualizar aula", { error: error.message });
    return { success: false, message: "Não foi possível salvar a aula. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Aula atualizada com sucesso." };
}

export async function deleteLessonAction(
  _prevState: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const parsed = deleteLessonSchema.safeParse({ lessonId: formData.get("lesson_id") });

  if (!parsed.success) {
    return { success: false, message: "Aula inválida." };
  }

  const auth = await requireAdminUser();

  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  // Soft delete — preserve lesson_progress history (D-02 / CAT-03)
  const { error } = await auth.supabase
    .from("lessons")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.lessonId);

  if (error) {
    logger.error("Falha ao arquivar aula", { error: error.message });
    return { success: false, message: "Não foi possível arquivar a aula. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Aula arquivada. Histórico de progresso de alunos preservado." };
}

export async function restoreLessonAction(
  _prevState: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const parsed = restoreLessonSchema.safeParse({ lessonId: formData.get("lesson_id") });

  if (!parsed.success) {
    return { success: false, message: "Aula inválida." };
  }

  const auth = await requireAdminUser();

  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const { error } = await auth.supabase
    .from("lessons")
    .update({ deleted_at: null })
    .eq("id", parsed.data.lessonId);

  if (error) {
    logger.error("Falha ao restaurar aula", { error: error.message });
    return { success: false, message: "Não foi possível restaurar a aula. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Aula restaurada com sucesso." };
}

export async function reorderLessonAction(
  _prevState: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const parsed = reorderLessonSchema.safeParse({
    lessonId: formData.get("lesson_id"),
    direction: formData.get("direction"),
  });

  if (!parsed.success) {
    return { success: false, message: "Dados de reordenação inválidos." };
  }

  const auth = await requireAdminUser();

  if (auth.errorMessage) {
    return { success: false, message: auth.errorMessage };
  }

  const { lessonId, direction } = parsed.data;

  // Read current lesson position and module_id
  const { data: current, error: readError } = await auth.supabase
    .from("lessons")
    .select("position, module_id")
    .eq("id", lessonId)
    .single();

  if (readError || !current) {
    return { success: false, message: "Aula não encontrada." };
  }

  // Find the actual adjacent active lesson by ORDER — not by position arithmetic.
  // This is correct when soft-deleted lessons leave gaps in the position sequence.
  const neighborQuery = auth.supabase
    .from("lessons")
    .select("id, position")
    .eq("module_id", current.module_id)
    .is("deleted_at", null)
    .limit(1);

  const { data: neighbor } =
    direction === "up"
      ? await neighborQuery.lt("position", current.position).order("position", { ascending: false })
      : await neighborQuery.gt("position", current.position).order("position", { ascending: true });

  if (!neighbor || neighbor.length === 0) {
    return { success: false, message: "Não é possível mover além do limite." };
  }

  const neighborLesson = neighbor[0];

  // Optimistic concurrency check: re-read the current lesson position before writing.
  // If it changed since the first read, a concurrent call already moved it — treat as
  // a no-op so that double-submits do not skip positions.
  const { data: fresh, error: freshError } = await auth.supabase
    .from("lessons")
    .select("position")
    .eq("id", lessonId)
    .single();

  if (freshError || !fresh) {
    return { success: false, message: "Aula não encontrada." };
  }

  if (fresh.position !== current.position) {
    // Another concurrent call already moved this lesson — safe to return success
    // so the UI re-renders without showing a spurious error.
    revalidatePath("/admin/cursos", "layout");
    return { success: true, message: "Ordem atualizada." };
  }

  // Swap positions — sequential (NOT atomic); accept-low-severity per T-02-T6.
  // The concurrency guard above eliminates the double-submit skip-position bug.
  const { error: e1 } = await auth.supabase
    .from("lessons")
    .update({ position: neighborLesson.position })
    .eq("id", lessonId);

  const { error: e2 } = await auth.supabase
    .from("lessons")
    .update({ position: current.position })
    .eq("id", neighborLesson.id);

  if (e1 ?? e2) {
    logger.error("Falha ao reordenar aulas", { e1: e1?.message, e2: e2?.message });
    return { success: false, message: "Não foi possível reordenar. Tente novamente." };
  }

  revalidatePath("/admin/cursos", "layout");
  return { success: true, message: "Ordem atualizada." };
}
