"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getClientEnv } from "@/lib/env";

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getClientEnv();
    browserClient = createBrowserClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      isSingleton: true,
    });
  }

  return browserClient;
}
