import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getEnv();

  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.trim().length === 0) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to insert institutional leads.");
  }

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
