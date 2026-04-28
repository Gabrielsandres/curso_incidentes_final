"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function convertPendingEnrollmentsForEmail(email: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();

  // 1. Find all pending enrollments for this email
  const { data: pending, error: pendingError } = await supabase
    .from("pending_enrollments")
    .select("id, course_id, expires_at")
    .eq("email", normalizedEmail);

  if (pendingError) {
    logger.error("Falha ao buscar pending_enrollments", { email: normalizedEmail, error: pendingError.message });
    return;
  }

  if (!pending || pending.length === 0) return;

  // 2. Look up the newly created profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!profile) {
    logger.error("Perfil não encontrado ao converter pending_enrollments", { email: normalizedEmail });
    return;
  }

  // 3. Convert each pending row
  for (const row of pending) {
    const { error: insertError } = await supabase.from("enrollments").insert({
      user_id: profile.id,
      course_id: row.course_id,
      source: "admin_grant",
      granted_at: new Date().toISOString(),
      expires_at: row.expires_at ?? null,
    });

    if (insertError && insertError.code !== "23505") {
      // Non-duplicate error: log and keep pending row (enrollment not created)
      logger.error("Falha ao converter pending_enrollment", {
        email: normalizedEmail,
        error: insertError.message,
        code: insertError.code,
      });
      continue;
    }

    // Success or 23505 (already enrolled): delete the stale pending row
    await supabase.from("pending_enrollments").delete().eq("id", row.id);
  }
}
