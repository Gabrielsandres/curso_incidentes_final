import { NextResponse } from "next/server";

import { fetchUserProfile } from "@/lib/auth/profiles";
import { fetchUserRole } from "@/lib/auth/roles";
import { getUserDisplayName } from "@/lib/auth/user-display-name";
import { ensureCourseCertificateIssued } from "@/lib/certificates/issuer";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CertificateSignedUrlRequest = {
  courseId?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error("Failed to load authenticated session on certificate signed URL", userError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role === "admin") {
    return NextResponse.json(
      { error: "forbidden", message: "Apenas alunos podem baixar certificado nesta rota." },
      { status: 403 },
    );
  }

  let payload: CertificateSignedUrlRequest;
  try {
    payload = (await request.json()) as CertificateSignedUrlRequest;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const courseId = typeof payload.courseId === "string" ? payload.courseId.trim() : "";
  if (!courseId) {
    return NextResponse.json({ error: "course_id_required" }, { status: 400 });
  }

  if (!UUID_REGEX.test(courseId)) {
    return NextResponse.json({ error: "invalid_course_id" }, { status: 400 });
  }

  const profile = await fetchUserProfile(supabase, user.id);
  const userDisplayName = getUserDisplayName(user, profile?.full_name);

  const result = await ensureCourseCertificateIssued({
    userId: user.id,
    courseId,
    userDisplayName,
  });

  if (result.status === "course_not_found") {
    return NextResponse.json({ error: "course_not_found" }, { status: 404 });
  }

  if (result.status === "certificate_disabled") {
    return NextResponse.json(
      { error: "certificate_disabled", message: "Este curso nao possui emissao de certificado." },
      { status: 403 },
    );
  }

  if (result.status === "configuration_invalid") {
    return NextResponse.json(
      { error: "certificate_configuration_invalid", message: "Configuracao do certificado incompleta para este curso." },
      { status: 403 },
    );
  }

  if (result.status === "not_eligible") {
    return NextResponse.json(
      {
        error: "certificate_not_eligible",
        message: "Conclua todas as aulas do curso para liberar o certificado.",
        progress: {
          totalLessons: result.totalLessons,
          completedLessons: result.completedLessons,
        },
      },
      { status: 403 },
    );
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const certificate = result.certificate;
    const fileName = `certificado-${certificate.certificate_code}.pdf`;
    const { data, error } = await adminSupabase.storage.from(certificate.file_bucket).createSignedUrl(certificate.file_path, 300, {
      download: fileName,
    });

    if (error || !data?.signedUrl) {
      logger.error("Falha ao criar URL assinada do certificado", {
        userId: user.id,
        courseId,
        certificateId: certificate.id,
        bucket: certificate.file_bucket,
        path: certificate.file_path,
        error: error?.message,
      });
      return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      source: result.status,
      certificateCode: certificate.certificate_code,
      issuedAt: certificate.issued_at,
      url: data.signedUrl,
    });
  } catch (error) {
    logger.error("Erro inesperado ao assinar URL de certificado", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
  }
}
