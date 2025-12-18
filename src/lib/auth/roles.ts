import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export const DEFAULT_ROLE: UserRole = "student";

export async function fetchUserRole(client: SupabaseClient<Database>, userId: string): Promise<UserRole> {
  const { data, error } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();

  if (error) {
    console.error("Failed to load user role", error.message);
    return DEFAULT_ROLE;
  }

  return (data?.role as UserRole | null) ?? DEFAULT_ROLE;
}
