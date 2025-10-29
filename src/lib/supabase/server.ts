import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await Promise.resolve(cookies());
  const headersList = await Promise.resolve(headers());
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
        cookieBatch.forEach(({ name, value, options }) => {
          if (!value) {
            if ("delete" in cookieStore) {
              // @ts-expect-error Next exposes delete at runtime
              cookieStore.delete(name);
            }
            return;
          }

          if (options && "set" in cookieStore) {
            // @ts-expect-error Next provides mutation helpers at runtime
            cookieStore.set({ name, value, ...options });
            return;
          }

          if ("set" in cookieStore) {
            // @ts-expect-error Next provides mutation helpers at runtime
            cookieStore.set(name, value);
          }
        });
      },
    },
    global: {
      headers: Object.fromEntries(headersList.entries()),
    },
  });
}
