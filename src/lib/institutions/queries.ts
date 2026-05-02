// src/lib/institutions/queries.ts
//
// Server-only data access for the Phase 5 (B2B Institution Manager) surface.
// - getInstitutionForManager: RLS-respecting; resolves the institution a user manages
// - getInstitutionMembersWithProgress: admin-bypass; the per-team progress matrix
// - getInstitutionCertificates: admin-bypass; certificates issued to institution members
// - getAdminInstitutionList: RLS-respecting (admin already gated by middleware); list page

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type {
  InstitutionCertificateRow,
  InstitutionMemberRole,
  InstitutionMemberWithProgress,
  InstitutionRow,
  InstitutionWithStats,
  MatrixCell,
} from "./types";

type SupabaseServerClient = SupabaseClient<Database>;

async function resolveClient(client?: SupabaseServerClient): Promise<SupabaseServerClient> {
  if (client) {
    return client;
  }
  return createSupabaseServerClient();
}

// ---------------------------------------------------------------------------
// 1. getInstitutionForManager — RLS-respecting
// ---------------------------------------------------------------------------

/**
 * Resolves the institution where the given user has role='manager'.
 * Uses the RLS-respecting server client; the existing
 * "Members read own membership" policy on institution_members and
 * "Members read own institution" policy on institutions cover this access pattern.
 *
 * Returns null for orphan managers (zero rows) — middleware (per CONTEXT D-02)
 * is responsible for redirecting orphaned managers to /dashboard with a flash.
 */
export async function getInstitutionForManager(
  client: SupabaseServerClient | undefined,
  userId: string,
): Promise<InstitutionRow | null> {
  const supabase = await resolveClient(client);

  const { data: membership, error: memberErr } = await supabase
    .from("institution_members")
    .select("institution_id")
    .eq("profile_id", userId)
    .eq("role", "manager")
    .limit(1)
    .maybeSingle();

  if (memberErr) {
    logger.error("Falha ao resolver instituição do gestor", {
      userId,
      error: memberErr.message,
    });
    return null;
  }

  if (!membership) {
    return null;
  }

  const { data: institution, error: instErr } = await supabase
    .from("institutions")
    .select("id, slug, name, contact_email, created_at, updated_at")
    .eq("id", membership.institution_id)
    .maybeSingle();

  if (instErr) {
    logger.error("Falha ao carregar instituição do gestor", {
      institutionId: membership.institution_id,
      error: instErr.message,
    });
    return null;
  }

  return institution ?? null;
}

// ---------------------------------------------------------------------------
// 2. getInstitutionMembersWithProgress — admin bypass
// ---------------------------------------------------------------------------

type EnrollmentJoinRow = {
  user_id: string;
  course_id: string;
  expires_at: string | null;
  courses: { id: string; title: string; slug: string } | null;
};

type ModuleLessonsJoinRow = {
  course_id: string;
  deleted_at: string | null;
  lessons: { id: string; deleted_at: string | null }[] | null;
};

type ProgressRow = {
  user_id: string;
  lesson_id: string;
  status: Database["public"]["Enums"]["lesson_progress_status"];
};

type MemberWithProfile = {
  profile_id: string;
  role: string;
  profiles: { full_name: string } | null;
};

/**
 * Returns the per-team progress matrix used by the gestor dashboard:
 * one row per institution member, each with their per-course completion stats.
 *
 * Performance contract (per RESEARCH §Code Examples Example 1):
 * 5 batched queries total, regardless of member count or course count.
 * No N+1.
 */
export async function getInstitutionMembersWithProgress(
  adminClient: SupabaseServerClient,
  institutionId: string,
): Promise<InstitutionMemberWithProgress[]> {
  // BYPASS JUSTIFICATION (per CLAUDE.md and PROJECT.md Concerns):
  // The "Students read own enrollments" RLS policy filters expires_at IS NULL OR > now().
  // The manager dashboard MUST display expired enrollments per ENR-04 + D-12 (visibility
  // is preserved as historical record). Rather than adding a new RLS policy that grants
  // managers a broader read on enrollments, we use the admin client server-side and
  // explicitly filter by institution_id (which is the intended scope). The admin client
  // is server-only and the explicit filter mirrors the RLS authorization scope.

  // Step 1: members + profile names (single query)
  const membersRes = await adminClient
    .from("institution_members")
    .select("profile_id, role, profiles!inner(full_name)")
    .eq("institution_id", institutionId);

  if (membersRes.error) {
    logger.error("Falha ao carregar membros da instituição", {
      institutionId,
      error: membersRes.error.message,
    });
    return [];
  }

  const members = (membersRes.data as unknown as MemberWithProfile[] | null) ?? [];
  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((m) => m.profile_id);

  // Step 2: enrollments for these users in this institution (INCLUDES expired)
  const enrollmentsRes = await adminClient
    .from("enrollments")
    .select("user_id, course_id, expires_at, courses!inner(id, title, slug)")
    .eq("institution_id", institutionId)
    .in("user_id", userIds);

  if (enrollmentsRes.error) {
    logger.error("Falha ao carregar enrollments da instituição", {
      institutionId,
      error: enrollmentsRes.error.message,
    });
    return [];
  }

  const enrollments = (enrollmentsRes.data as unknown as EnrollmentJoinRow[] | null) ?? [];

  // Step 3: collect unique course IDs to fetch lessons
  const courseIds = Array.from(new Set(enrollments.map((e) => e.course_id)));

  // No enrollments at all — return members with empty courses arrays.
  if (courseIds.length === 0) {
    return members.map((m) => ({
      profileId: m.profile_id,
      fullName: m.profiles?.full_name ?? "—",
      memberRole: (m.role as InstitutionMemberRole) ?? "student",
      courses: [],
    }));
  }

  // Step 4: fetch active modules + lessons for those courses (deleted_at IS NULL)
  const lessonsRes = await adminClient
    .from("modules")
    .select("course_id, deleted_at, lessons(id, deleted_at)")
    .in("course_id", courseIds)
    .is("deleted_at", null);

  if (lessonsRes.error) {
    logger.error("Falha ao carregar lessons para matriz", {
      institutionId,
      error: lessonsRes.error.message,
    });
    return [];
  }

  const lessonsByCourseId = new Map<string, string[]>();
  const moduleRows = (lessonsRes.data as unknown as ModuleLessonsJoinRow[] | null) ?? [];
  for (const moduleRow of moduleRows) {
    const lessonIds = (moduleRow.lessons ?? [])
      .filter((l) => !l.deleted_at)
      .map((l) => l.id);
    const existing = lessonsByCourseId.get(moduleRow.course_id) ?? [];
    lessonsByCourseId.set(moduleRow.course_id, [...existing, ...lessonIds]);
  }

  const allLessonIds = Array.from(new Set([...lessonsByCourseId.values()].flat()));

  // Step 5: lesson_progress for all (user, lesson) pairs (batched)
  let completedSet = new Set<string>();
  if (allLessonIds.length > 0) {
    const progressRes = await adminClient
      .from("lesson_progress")
      .select("user_id, lesson_id, status")
      .in("user_id", userIds)
      .in("lesson_id", allLessonIds);

    if (progressRes.error) {
      logger.error("Falha ao carregar progresso da matriz", {
        institutionId,
        error: progressRes.error.message,
      });
      return [];
    }

    const progressRows = (progressRes.data as unknown as ProgressRow[] | null) ?? [];
    completedSet = new Set(
      progressRows
        .filter((p) => p.status === "COMPLETED")
        .map((p) => `${p.user_id}::${p.lesson_id}`),
    );
  }

  const now = Date.now();

  // Step 6: assemble per-member matrix
  return members.map((m) => {
    const memberEnrollments = enrollments.filter((e) => e.user_id === m.profile_id);
    const cells: MatrixCell[] = memberEnrollments.map((e) => {
      const course = e.courses;
      const lessonIds = lessonsByCourseId.get(e.course_id) ?? [];
      const totalLessons = lessonIds.length;
      const completedLessons = lessonIds.filter((lid) =>
        completedSet.has(`${m.profile_id}::${lid}`),
      ).length;
      const completionPercentage =
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const enrollmentExpired =
        e.expires_at !== null && new Date(e.expires_at).getTime() < now;
      return {
        courseId: course?.id ?? e.course_id,
        courseTitle: course?.title ?? "—",
        courseSlug: course?.slug ?? "",
        totalLessons,
        completedLessons,
        completionPercentage,
        enrollmentExpired,
      };
    });

    return {
      profileId: m.profile_id,
      fullName: m.profiles?.full_name ?? "—",
      memberRole: (m.role as InstitutionMemberRole) ?? "student",
      courses: cells,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. getInstitutionCertificates — admin bypass
// ---------------------------------------------------------------------------

type CertificateJoinRow = {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_code: string;
  courses: { title: string } | null;
  profiles: { full_name: string } | null;
};

/**
 * Returns certificates issued to members of the institution, ordered by issued_at DESC.
 * Manager needs visibility regardless of current enrollment expiration (CERT-05 + D-12).
 */
export async function getInstitutionCertificates(
  adminClient: SupabaseServerClient,
  institutionId: string,
): Promise<InstitutionCertificateRow[]> {
  // BYPASS JUSTIFICATION (per CLAUDE.md and PROJECT.md Concerns):
  // Same rationale as getInstitutionMembersWithProgress: manager needs visibility of
  // certificates issued to members regardless of current enrollment state. RLS read
  // policy on course_certificates is "user reads own only"; manager bypass via admin
  // client + explicit filter (member of THIS institution + cert.user_id IN member_ids)
  // mirrors the intended authorization scope.

  // Step 1: member ids in this institution
  const membersRes = await adminClient
    .from("institution_members")
    .select("profile_id")
    .eq("institution_id", institutionId);

  if (membersRes.error) {
    logger.error("Falha ao carregar membros para certificados", {
      institutionId,
      error: membersRes.error.message,
    });
    return [];
  }

  const memberRows = (membersRes.data ?? []) as Array<{ profile_id: string }>;
  if (memberRows.length === 0) {
    return [];
  }
  const userIds = memberRows.map((m) => m.profile_id);

  // Step 2: certificates for those users + course title + student name
  const certsRes = await adminClient
    .from("course_certificates")
    .select(
      "id, user_id, course_id, issued_at, certificate_code, courses!inner(title), profiles!inner(full_name)",
    )
    .in("user_id", userIds)
    .order("issued_at", { ascending: false });

  if (certsRes.error) {
    logger.error("Falha ao carregar certificados da instituição", {
      institutionId,
      error: certsRes.error.message,
    });
    return [];
  }

  const certs = (certsRes.data as unknown as CertificateJoinRow[] | null) ?? [];

  return certs.map((row) => ({
    studentName: row.profiles?.full_name ?? "—",
    courseTitle: row.courses?.title ?? "—",
    issuedAt: row.issued_at,
    certificateCode: row.certificate_code,
  }));
}

// ---------------------------------------------------------------------------
// 4. getAdminInstitutionList — RLS-respecting (admin gated by middleware)
// ---------------------------------------------------------------------------

type InstitutionListRow = InstitutionRow & {
  institution_members:
    | Array<{ profile_id: string; role: string }>
    | null;
};

/**
 * Returns the institution list shown on /admin/instituicoes.
 * Each row is augmented with memberCount + hasManager flags so the page can
 * render summary stats without N+1 follow-up queries.
 *
 * Admin already gated by middleware ("Admins read all enrollments" / admin role
 * check); this query uses the standard server client.
 */
export async function getAdminInstitutionList(
  client?: SupabaseServerClient,
): Promise<InstitutionWithStats[]> {
  const supabase = await resolveClient(client);

  const { data: institutions, error } = await supabase
    .from("institutions")
    .select(
      "id, slug, name, contact_email, created_at, updated_at, institution_members(profile_id, role)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Falha ao carregar lista de instituições", { error: error.message });
    return [];
  }

  const rows = (institutions as unknown as InstitutionListRow[] | null) ?? [];

  return rows.map((row) => {
    const members = row.institution_members ?? [];
    const memberCount = members.length;
    const hasManager = members.some((m) => m.role === "manager");
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      contact_email: row.contact_email,
      created_at: row.created_at,
      updated_at: row.updated_at,
      memberCount,
      hasManager,
    } satisfies InstitutionWithStats;
  });
}
