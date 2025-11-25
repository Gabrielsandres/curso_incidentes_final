import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";

const PROTECTED_ROUTES = ["/dashboard", "/curso"];
const AUTH_ROUTES = ["/login"];

function isProtectedPath(path: string) {
  return PROTECTED_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } = getEnv();
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          if (!value) {
            response.cookies.delete(name);
            return;
          }

          if (options) {
            response.cookies.set({ name, value, ...options });
            return;
          }

          response.cookies.set(name, value);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && isProtectedPath(path)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/curso/:path*", "/login"],
};
