import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { captureMessage } from "@/lib/observability/sentry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileRole = Database["public"]["Enums"]["user_role"];

export async function fetchUserProfile(client: SupabaseClient<Database>, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("Failed to load user profile", { userId, error: error.message, code: error.code });
    return null;
  }

  return data as ProfileRow | null;
}

export async function fetchAuthenticatedUserProfile(client: SupabaseClient<Database>) {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    logger.error("Failed to load authenticated user before profile lookup", error.message);
  }

  if (!user) {
    return { user: null as User | null, profile: null as ProfileRow | null };
  }

  const profile = await fetchUserProfile(client, user.id);
  return { user, profile };
}

/**
 * Guardrail: ensures a profile row exists for the given userId.
 * The auth trigger (0010) handles the normal signup path; this runs on post-auth flows
 * to catch the rare case where the trigger failed silently (logged to Postgres only).
 *
 * Uses the admin client (bypasses RLS) because the user's session JWT may not be present
 * when this runs in the post-signup confirmation flow.
 * RLS bypass rationale: reading/writing own profile row on behalf of the authenticated
 * user who just completed the auth flow.
 *
 * When the guardrail fires, emits a Sentry breadcrumb so production drift is observable.
 */
export async function ensureProfileExists(
  userId: string,
  metadata?: { fullName?: string }
): Promise<void> {
  const adminClient = createSupabaseAdminClient();

  // Fast path: check if profile exists
  const { data: existing, error: readError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    logger.error("ensureProfileExists: failed to read profile", {
      userId,
      error: readError.message,
    });
    return;
  }

  if (existing) return; // common path — profile exists, do nothing

  // Guardrail fires: DB trigger must have failed silently
  logger.warn("ensureProfileExists: profile row missing, inserting fallback", { userId });
  captureMessage("auth_profile_trigger_gap_detected", "warning", { userId });

  const { error: insertError } = await adminClient.from("profiles").insert({
    id: userId,
    full_name: metadata?.fullName ?? "Aluno",
    role: "student",
  });

  if (insertError) {
    logger.error("ensureProfileExists: fallback insert failed", {
      userId,
      error: insertError.message,
    });
  }
}
