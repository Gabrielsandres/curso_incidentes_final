import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SignedUrlRequest = {
  materialId?: string;
  mode?: "view" | "download";
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error("Failed to load authenticated session on material signed URL", userError.message);
  }

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: SignedUrlRequest;
  try {
    payload = (await request.json()) as SignedUrlRequest;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const materialId = typeof payload.materialId === "string" ? payload.materialId : "";
  const mode = payload.mode === "download" ? "download" : "view";

  if (!materialId) {
    return NextResponse.json({ error: "material_id_required" }, { status: 400 });
  }

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select(
      "id, source_kind, resource_url, storage_bucket, storage_path, original_file_name, lesson_id, lessons!inner ( id )",
    )
    .eq("id", materialId)
    .maybeSingle();

  if (materialError) {
    logger.error("Falha ao buscar material para URL assinada", { materialId, error: materialError.message });
    return NextResponse.json({ error: "material_lookup_failed" }, { status: 500 });
  }

  if (!material) {
    return NextResponse.json({ error: "material_not_found" }, { status: 404 });
  }

  const sourceKind = ((material as { source_kind?: string | null }).source_kind ?? "LINK").toUpperCase();

  if (sourceKind !== "UPLOAD") {
    const directUrl = (material as { resource_url?: string | null }).resource_url ?? null;
    if (!directUrl) {
      return NextResponse.json({ error: "material_url_missing" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, url: directUrl, sourceKind: "LINK" });
  }

  const bucket = (material as { storage_bucket?: string | null }).storage_bucket;
  const path = (material as { storage_path?: string | null }).storage_path;
  const fileName = (material as { original_file_name?: string | null }).original_file_name ?? undefined;

  if (!bucket || !path) {
    return NextResponse.json({ error: "storage_metadata_missing" }, { status: 400 });
  }

  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data, error } = await adminSupabase.storage.from(bucket).createSignedUrl(path, 300, {
      download: mode === "download" ? fileName ?? true : undefined,
    });

    if (error || !data?.signedUrl) {
      logger.error("Falha ao criar URL assinada para material", { materialId, bucket, path, error: error?.message });
      return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: data.signedUrl, sourceKind: "UPLOAD" });
  } catch (error) {
    logger.error("Erro inesperado ao criar URL assinada de material", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "signed_url_failed" }, { status: 500 });
  }
}
