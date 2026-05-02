"use server";

import { z } from "zod";

import { fetchUserRole } from "@/lib/auth/roles";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Local input shape — this action is not a useActionState consumer, so the
// schema lives next to the action rather than in src/lib/institutions/schema.ts.
const inputSchema = z.object({
  institution_id: z.string().uuid(),
  query: z.string().trim().max(120),
});

export type StudentSearchResult = {
  id: string;
  fullName: string;
  email: string;
};

/**
 * Server action for the "Adicionar aluno existente" autocomplete (D-06).
 *
 * Returns up to 20 student profiles whose full_name OR email matches `query`,
 * excluding profiles that are already members of the given institution.
 *
 * Auth: admin-only. Non-admin callers (or unauthenticated) silently get [].
 *       (Returning [] rather than throwing keeps the autocomplete UI from
 *       leaking auth state through error vs. empty differentiation.)
 *
 * Performance:
 *  - Profiles are scoped server-side via `.ilike("full_name", %query%)`.
 *  - Emails come from `auth.admin.listUsers` (perPage 1000, single page) —
 *    profiles has no email column. T-05-05-07 (DoS) accepted at v1 scale.
 */
export async function searchStudentsForInstitution(
  institutionId: string,
  query: string,
): Promise<StudentSearchResult[]> {
  // Admin gate — read role server-side via fetchUserRole. Never trust caller.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    logger.error(
      "Failed to load authenticated session on student search",
      userError.message,
    );
  }
  if (!user) {
    return [];
  }
  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    return [];
  }

  const parsed = inputSchema.safeParse({ institution_id: institutionId, query });
  if (!parsed.success) {
    return [];
  }
  // Below the autocomplete trigger threshold — no point hitting the DB.
  if (parsed.data.query.length < 2) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();

  // Resolve current member ids so we can exclude them from results.
  const { data: members, error: membersError } = await adminClient
    .from("institution_members")
    .select("profile_id")
    .eq("institution_id", parsed.data.institution_id);

  if (membersError) {
    logger.error("Falha ao listar membros para exclusão na busca", {
      institution_id: parsed.data.institution_id,
      error: membersError.message,
    });
    return [];
  }

  const excludeIds = new Set((members ?? []).map((m) => m.profile_id));

  // Search profiles by full_name (case-insensitive). The role='student' filter
  // both narrows results to the right population and excludes the admin/manager
  // user picking from this autocomplete.
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${parsed.data.query}%`)
    .eq("role", "student")
    .order("full_name")
    .limit(20);

  if (profilesError) {
    logger.error("Falha ao buscar profiles para autocomplete", {
      query: parsed.data.query,
      error: profilesError.message,
    });
    return [];
  }

  // profiles has no email column — pull emails from auth.admin.listUsers.
  // Pitfall 6: cap perPage at 1000 (Supabase auth-admin server limit).
  const { data: allAuthUsers } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailById = new Map<string, string>();
  for (const u of allAuthUsers?.users ?? []) {
    emailById.set(u.id, u.email ?? "");
  }

  const q = parsed.data.query.toLowerCase();
  return (profiles ?? [])
    .filter((p) => !excludeIds.has(p.id))
    .map((p) => ({
      id: p.id,
      fullName: p.full_name,
      email: emailById.get(p.id) ?? "",
    }))
    .filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
}
