"use server";

import { revalidatePath } from "next/cache";

import type { CourseFormState } from "@/app/actions/course-form-state";
import { fetchUserRole } from "@/lib/auth/roles";
import { createCourseSchema, updateCourseSchema } from "@/lib/courses/schema";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated session on course admin action", error.message);
  }

  if (!user) {
    return { supabase, user: null as null, errorMessage: "Sessao expirada. Atualize a pagina e tente novamente." };
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return { supabase, user: null as null, errorMessage: "Voce nao tem permissao para gerenciar cursos." };
  }

  return { supabase, user, errorMessage: null as string | null };
}

function buildCoursePayload(parsedData: {
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl?: string;
  certificateEnabled: boolean;
  certificateTemplateUrl?: string;
  certificateWorkloadHours?: number;
  certificateSignerName?: string;
  certificateSignerRole?: string;
}) {
  const isCertificateEnabled = parsedData.certificateEnabled;

  return {
    slug: parsedData.slug,
    title: parsedData.title,
    description: parsedData.description ?? null,
    cover_image_url: parsedData.coverImageUrl ?? null,
    certificate_enabled: isCertificateEnabled,
    certificate_template_url: isCertificateEnabled ? parsedData.certificateTemplateUrl ?? null : null,
    certificate_workload_hours: isCertificateEnabled ? parsedData.certificateWorkloadHours ?? null : null,
    certificate_signer_name: isCertificateEnabled ? parsedData.certificateSignerName ?? null : null,
    certificate_signer_role: isCertificateEnabled ? parsedData.certificateSignerRole ?? null : null,
  };
}

function formatSupabaseInsertOrUpdateError(error: { code?: string | null; message?: string | null }) {
  const permissionDenied = error.code === "42501" || (error.message ?? "").toLowerCase().includes("permission denied");
  const uniqueViolation = error.code === "23505" || (error.message ?? "").toLowerCase().includes("duplicate");

  if (permissionDenied) {
    return "Voce nao tem permissao para salvar cursos (RLS).";
  }

  if (uniqueViolation) {
    return "Ja existe um curso com este slug. Escolha outro slug.";
  }

  return "Nao foi possivel salvar o curso. Tente novamente.";
}

function revalidateCoursePages() {
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/curso/[slug]", "page");
}

export async function createCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const parsed = createCourseSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description"),
    coverImageUrl: formData.get("cover_image_url"),
    certificateEnabled: formData.get("certificate_enabled"),
    certificateTemplateUrl: formData.get("certificate_template_url"),
    certificateWorkloadHours: formData.get("certificate_workload_hours"),
    certificateSignerName: formData.get("certificate_signer_name"),
    certificateSignerRole: formData.get("certificate_signer_role"),
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

  const { error } = await auth.supabase.from("courses").insert(buildCoursePayload(parsed.data)).select("id").single();

  if (error) {
    logger.error("Falha ao criar curso", { error: error.message, code: error.code });
    return { success: false, message: formatSupabaseInsertOrUpdateError(error) };
  }

  revalidateCoursePages();

  return {
    success: true,
    message: "Curso criado com sucesso.",
  };
}

export async function updateCourseAction(
  _prevState: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  const parsed = updateCourseSchema.safeParse({
    courseId: formData.get("course_id"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    description: formData.get("description"),
    coverImageUrl: formData.get("cover_image_url"),
    certificateEnabled: formData.get("certificate_enabled"),
    certificateTemplateUrl: formData.get("certificate_template_url"),
    certificateWorkloadHours: formData.get("certificate_workload_hours"),
    certificateSignerName: formData.get("certificate_signer_name"),
    certificateSignerRole: formData.get("certificate_signer_role"),
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
    .from("courses")
    .update(buildCoursePayload(parsed.data))
    .eq("id", parsed.data.courseId)
    .select("id")
    .single();

  if (error) {
    logger.error("Falha ao atualizar curso", { courseId: parsed.data.courseId, error: error.message, code: error.code });
    return { success: false, message: formatSupabaseInsertOrUpdateError(error) };
  }

  revalidateCoursePages();

  return {
    success: true,
    message: "Curso atualizado com sucesso.",
  };
}
