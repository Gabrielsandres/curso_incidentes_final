import { NextResponse } from "next/server";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { uploadLessonMaterialFile } from "@/lib/materials/upload";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error("Failed to load authenticated session on material upload", userError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const lessonId = String(formData.get("lessonId") ?? "");
  const moduleId = String(formData.get("moduleId") ?? "");
  const file = formData.get("file");

  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id_required" }, { status: 400 });
  }

  if (!UUID_REGEX.test(lessonId)) {
    return NextResponse.json({ error: "invalid_lesson_id" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, module_id, modules!inner ( id, course_id )")
    .eq("id", lessonId)
    .maybeSingle();

  if (lessonError) {
    logger.error("Falha ao validar aula para upload de material", { lessonId, error: lessonError.message });
    return NextResponse.json({ error: "lesson_lookup_failed" }, { status: 500 });
  }

  let courseId: string | null = null;

  if (lesson) {
    courseId = (lesson as { modules: { course_id: string } }).modules.course_id;
  } else {
    if (!moduleId) {
      return NextResponse.json({ error: "module_id_required_for_preupload" }, { status: 400 });
    }

    if (!UUID_REGEX.test(moduleId)) {
      return NextResponse.json({ error: "invalid_module_id" }, { status: 400 });
    }

    const { data: module, error: moduleError } = await supabase
      .from("modules")
      .select("id, course_id")
      .eq("id", moduleId)
      .maybeSingle();

    if (moduleError) {
      logger.error("Falha ao validar modulo para pre-upload de material", { moduleId, error: moduleError.message });
      return NextResponse.json({ error: "module_lookup_failed" }, { status: 500 });
    }

    if (!module) {
      return NextResponse.json({ error: "module_not_found" }, { status: 404 });
    }

    courseId = module.course_id;
  }

  const uploadResult = await uploadLessonMaterialFile({ file, courseId, lessonId });

  if (!uploadResult.success) {
    return NextResponse.json({ error: "upload_failed", message: uploadResult.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    metadata: uploadResult.metadata,
  });
}
