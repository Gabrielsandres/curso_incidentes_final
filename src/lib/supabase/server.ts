import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await Promise.resolve(cookies());
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getEnv();

  return createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookieBatch) {
        try {
          cookieBatch.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        } catch {
          // Server Components can read cookies but cannot persist refreshed auth
          // cookies. Middleware, Server Actions and Route Handlers handle writes.
        }
      },
    },
  });
}
