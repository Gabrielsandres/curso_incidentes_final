import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getEnv } from "@/lib/env";
import { fetchUserRole } from "@/lib/auth/roles";

const PROTECTED_ROUTES = ["/dashboard", "/curso", "/admin", "/gestor"];
const ADMIN_ROUTES = ["/admin", "/dashboard/aulas"];
const GESTOR_ROUTES = ["/gestor"];
const AUTH_ROUTES = ["/login"];

function isProtectedPath(path: string) {
  return PROTECTED_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

function isAdminPath(path: string) {
  return ADMIN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}

function isGestorPath(path: string) {
  return GESTOR_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
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

  if (user && isAdminPath(path)) {
    const role = await fetchUserRole(supabase, user.id);

    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (user && isGestorPath(path)) {
    const role = await fetchUserRole(supabase, user.id);

    if (role === "admin") {
      // D-02: admin doesn't use /gestor — redirect to admin equivalent.
      return NextResponse.redirect(new URL("/admin/instituicoes", request.url));
    }

    if (role !== "institution_manager") {
      // Per D-02: any role other than admin/institution_manager is denied.
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // role === "institution_manager" — fall through to allow.
    // NOTE: orphan-manager check (zero institution_members rows) is intentionally NOT here.
    // Pitfall 1 + D-04: middleware runs every request; the orphan check belongs in
    // /gestor/page.tsx where it adds DB query latency only on /gestor navigations.
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/curso/:path*",
    "/admin/:path*",
    "/gestor/:path*",
    "/login",
  ],
};
