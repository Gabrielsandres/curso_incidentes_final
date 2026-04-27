import type { SupabaseClient } from "@supabase/supabase-js";

import type { CourseCertificateRow, CourseRow } from "@/lib/courses/types";
import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildCourseCertificatePdf } from "@/lib/certificates/pdf";

type AdminClient = SupabaseClient<Database>;

type CertificateIssuerDependencies = {
  createAdminClient?: () => AdminClient;
  buildPdf?: typeof buildCourseCertificatePdf;
  now?: () => Date;
};

type EnsureCourseCertificateIssuedParams = {
  userId: string;
  courseId: string;
  userDisplayName?: string | null;
};

type CourseProgress = {
  totalLessons: number;
  completedLessons: number;
};

type CertificateConfig = Pick<
  CourseRow,
  | "id"
  | "title"
  | "certificate_enabled"
  | "certificate_template_url"
  | "certificate_workload_hours"
  | "certificate_signer_name"
  | "certificate_signer_role"
>;

type EnsureCourseCertificateIssuedResult =
  | { status: "course_not_found" }
  | { status: "certificate_disabled" }
  | { status: "configuration_invalid" }
  | { status: "not_eligible"; totalLessons: number; completedLessons: number }
  | { status: "already_issued"; certificate: CourseCertificateRow }
  | { status: "issued"; certificate: CourseCertificateRow };

const COURSE_CERTIFICATE_SELECT =
  "id, user_id, course_id, issued_at, certificate_code, file_bucket, file_path, mime_type, file_size_bytes, created_at";

export const COURSE_CERTIFICATES_BUCKET = "certificates";

export async function ensureCourseCertificateIssued(
  params: EnsureCourseCertificateIssuedParams,
  dependencies: CertificateIssuerDependencies = {},
): Promise<EnsureCourseCertificateIssuedResult> {
  const admin = dependencies.createAdminClient?.() ?? createSupabaseAdminClient();
  const now = dependencies.now?.() ?? new Date();
  const buildPdf = dependencies.buildPdf ?? buildCourseCertificatePdf;

  const existingCertificate = await getExistingCertificate(admin, params.userId, params.courseId);
  if (existingCertificate) {
    return {
      status: "already_issued",
      certificate: existingCertificate,
    };
  }

  const course = await getCourseCertificateConfig(admin, params.courseId);
  if (!course) {
    return { status: "course_not_found" };
  }

  if (!course.certificate_enabled) {
    return { status: "certificate_disabled" };
  }

  if (
    !course.certificate_template_url ||
    !course.certificate_workload_hours ||
    !course.certificate_signer_name ||
    !course.certificate_signer_role
  ) {
    return { status: "configuration_invalid" };
  }

  const progress = await getUserCourseProgress(admin, params.userId, params.courseId);
  if (!isCertificateEligible(progress)) {
    return {
      status: "not_eligible",
      totalLessons: progress.totalLessons,
      completedLessons: progress.completedLessons,
    };
  }

  const certificateCode = buildCertificateCode();
  const userDisplayName = (params.userDisplayName?.trim() || (await resolveUserDisplayName(admin, params.userId))).trim() || "Aluno";

  const pdfBytes = await buildPdf({
    templateUrl: course.certificate_template_url,
    learnerName: userDisplayName,
    courseTitle: course.title,
    workloadHours: course.certificate_workload_hours,
    issuedAt: now,
    certificateCode,
  });

  const storagePath = buildCertificateStoragePath({
    courseId: params.courseId,
    userId: params.userId,
    certificateCode,
    now,
  });

  const { error: uploadError } = await admin.storage.from(COURSE_CERTIFICATES_BUCKET).upload(storagePath, pdfBytes, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) {
    logger.error("Falha ao enviar certificado para storage", {
      userId: params.userId,
      courseId: params.courseId,
      path: storagePath,
      error: uploadError.message,
    });
    throw new Error("Nao foi possivel armazenar o certificado.");
  }

  const { data: insertedCertificate, error: insertError } = await admin
    .from("course_certificates")
    .insert({
      user_id: params.userId,
      course_id: params.courseId,
      issued_at: now.toISOString(),
      certificate_code: certificateCode,
      file_bucket: COURSE_CERTIFICATES_BUCKET,
      file_path: storagePath,
      mime_type: "application/pdf",
      file_size_bytes: pdfBytes.byteLength,
    })
    .select(COURSE_CERTIFICATE_SELECT)
    .single();

  if (insertError) {
    if (isUniqueViolation(insertError.code, insertError.message)) {
      await admin.storage.from(COURSE_CERTIFICATES_BUCKET).remove([storagePath]).catch(() => undefined);
      const concurrentCertificate = await getExistingCertificate(admin, params.userId, params.courseId);
      if (concurrentCertificate) {
        return {
          status: "already_issued",
          certificate: concurrentCertificate,
        };
      }
    }

    await admin.storage.from(COURSE_CERTIFICATES_BUCKET).remove([storagePath]).catch(() => undefined);
    logger.error("Falha ao persistir certificado emitido", {
      userId: params.userId,
      courseId: params.courseId,
      path: storagePath,
      error: insertError.message,
      code: insertError.code,
    });
    throw new Error("Nao foi possivel salvar os metadados do certificado.");
  }

  return {
    status: "issued",
    certificate: insertedCertificate as CourseCertificateRow,
  };
}

export function isCertificateEligible(progress: CourseProgress) {
  return progress.totalLessons > 0 && progress.completedLessons >= progress.totalLessons;
}

async function getCourseCertificateConfig(admin: AdminClient, courseId: string): Promise<CertificateConfig | null> {
  const { data, error } = await admin
    .from("courses")
    .select(
      "id, title, certificate_enabled, certificate_template_url, certificate_workload_hours, certificate_signer_name, certificate_signer_role",
    )
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar configuracao de certificado do curso", { courseId, error: error.message, code: error.code });
    throw new Error("Falha ao validar configuracao do certificado.");
  }

  return (data as CertificateConfig | null) ?? null;
}

async function getExistingCertificate(admin: AdminClient, userId: string, courseId: string): Promise<CourseCertificateRow | null> {
  const { data, error } = await admin
    .from("course_certificates")
    .select(COURSE_CERTIFICATE_SELECT)
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (error) {
    logger.error("Falha ao buscar certificado existente", { userId, courseId, error: error.message, code: error.code });
    throw new Error("Falha ao consultar certificado existente.");
  }

  return (data as CourseCertificateRow | null) ?? null;
}

async function getUserCourseProgress(admin: AdminClient, userId: string, courseId: string): Promise<CourseProgress> {
  const { data: lessons, error: lessonsError } = await admin
    .from("lessons")
    .select("id, modules!inner(course_id)")
    .eq("modules.course_id", courseId);

  if (lessonsError) {
    logger.error("Falha ao carregar aulas para calculo de certificado", { userId, courseId, error: lessonsError.message });
    throw new Error("Falha ao validar progresso do curso.");
  }

  const lessonIds = ((lessons as { id: string }[] | null) ?? []).map((lesson) => lesson.id);
  if (lessonIds.length === 0) {
    return { totalLessons: 0, completedLessons: 0 };
  }

  const { data: completedLessons, error: progressError } = await admin
    .from("lesson_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .eq("status", "COMPLETED")
    .in("lesson_id", lessonIds);

  if (progressError) {
    logger.error("Falha ao carregar progresso para emissao de certificado", {
      userId,
      courseId,
      error: progressError.message,
    });
    throw new Error("Falha ao validar progresso do usuario.");
  }

  const uniqueCompletedLessons = new Set(((completedLessons as { lesson_id: string }[] | null) ?? []).map((item) => item.lesson_id));
  return {
    totalLessons: lessonIds.length,
    completedLessons: uniqueCompletedLessons.size,
  };
}

async function resolveUserDisplayName(admin: AdminClient, userId: string) {
  const { data, error } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  if (error) {
    logger.warn("Nao foi possivel carregar nome do usuario para certificado", { userId, error: error.message });
    return "Aluno";
  }

  return (data as { full_name?: string | null } | null)?.full_name ?? "Aluno";
}

function buildCertificateCode() {
  const randomSegment = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `CERT-${randomSegment}`;
}

function buildCertificateStoragePath(params: {
  courseId: string;
  userId: string;
  certificateCode: string;
  now: Date;
}) {
  const timestamp = params.now.toISOString().replace(/[:.]/g, "-");
  return `certificates/${params.courseId}/${params.userId}/${timestamp}-${params.certificateCode}.pdf`;
}

function isUniqueViolation(code: string | null | undefined, message: string | null | undefined) {
  const normalizedMessage = (message ?? "").toLowerCase();
  return code === "23505" || normalizedMessage.includes("duplicate") || normalizedMessage.includes("unique");
}
