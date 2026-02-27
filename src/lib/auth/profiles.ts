import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";

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
