import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type CompletionRequestPayload = {
  lessonId?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPermissionError(code: string | null | undefined, message: string | null | undefined) {
  const normalizedMessage = (message ?? "").toLowerCase();
  return code === "42501" || normalizedMessage.includes("permission denied") || normalizedMessage.includes("row-level security");
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error("Failed to load authenticated session on lesson completion", userError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: CompletionRequestPayload;
  try {
    payload = (await request.json()) as CompletionRequestPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const lessonId = typeof payload.lessonId === "string" ? payload.lessonId : "";

  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  }

  if (!UUID_REGEX.test(lessonId)) {
    return NextResponse.json({ error: "invalid_lesson_id" }, { status: 400 });
  }

  const { data: lesson, error: lessonError } = await supabase.from("lessons").select("id").eq("id", lessonId).maybeSingle();

  if (lessonError) {
    logger.error("Falha ao validar aula antes de marcar progresso", {
      userId: user.id,
      lessonId,
      error: lessonError.message,
      code: lessonError.code,
    });
    return NextResponse.json({ error: "lesson_validation_failed" }, { status: 500 });
  }

  if (!lesson) {
    return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const payloadToPersist = {
    user_id: user.id,
    lesson_id: lessonId,
    status: "COMPLETED" as const,
    completed_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("lesson_progress").upsert(
    payloadToPersist,
    { onConflict: "user_id,lesson_id" },
  );

  if (!error) {
    return NextResponse.json({ ok: true });
  }

  if (isPermissionError(error.code, error.message)) {
    try {
      const adminSupabase = createSupabaseAdminClient();
      const { error: adminError } = await adminSupabase.from("lesson_progress").upsert(
        payloadToPersist,
        { onConflict: "user_id,lesson_id" },
      );

      if (!adminError) {
        logger.warn("Fallback com service role para atualizar progresso de aula", { userId: user.id, lessonId });
        return NextResponse.json({ ok: true });
      }

      logger.error("Falha no fallback service role para atualizar progresso da aula", {
        userId: user.id,
        lessonId,
        error: adminError.message,
        code: adminError.code,
      });
      return NextResponse.json({ error: "failed_to_complete_lesson" }, { status: 500 });
    } catch (adminClientError) {
      logger.error("Service role indisponivel para fallback de progresso da aula", {
        userId: user.id,
        lessonId,
        error: adminClientError instanceof Error ? adminClientError.message : String(adminClientError),
      });
      return NextResponse.json(
        { error: "failed_to_complete_lesson", message: "Permissao insuficiente para atualizar progresso da aula." },
        { status: 500 },
      );
    }
  }

  logger.error("Falha ao atualizar progresso da aula", {
    userId: user.id,
    lessonId,
    error: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  return NextResponse.json(
    { error: "failed_to_complete_lesson", message: "Nao foi possivel salvar o progresso da aula." },
    { status: 500 },
  );
}
