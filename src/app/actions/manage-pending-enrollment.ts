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

  // 2. Look up the user's profile by email via auth.admin.listUsers
  // profiles table does not store email — must resolve via auth layer
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    logger.error("Falha ao buscar usuário por email ao converter pending_enrollments", {
      email: normalizedEmail,
      error: listError.message,
    });
    return;
  }

  const authUser = usersData.users.find((u) => u.email?.toLowerCase() === normalizedEmail);

  if (!authUser) {
    logger.error("Perfil não encontrado ao converter pending_enrollments", { email: normalizedEmail });
    return;
  }

  // 3. Fetch the profile row by auth user ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile) {
    logger.error("Perfil não encontrado ao converter pending_enrollments", { email: normalizedEmail });
    return;
  }

  // 4. Convert each pending row
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
