import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Breadcrumb } from "@/components/admin/breadcrumb";
import { LogoutButton } from "@/components/auth/logout-button";
import { fetchUserRole } from "@/lib/auth/roles";
import type {
  InstitutionMemberWithProfile,
  InstitutionRow,
} from "@/lib/institutions/types";
import { logger } from "@/lib/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { InstitutionManager } from "../institution-manager";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} | Admin — Gestão de Incidentes` };
}

type MemberJoinRow = {
  profile_id: string;
  role: string;
  created_at: string;
  profiles: { full_name: string } | null;
};

export default async function InstituicaoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logger.error(
      "Failed to load authenticated session on /admin/instituicoes/[slug]",
      error.message,
    );
  }

  if (!user) {
    const search = new URLSearchParams({
      redirectTo: `/admin/instituicoes/${slug}`,
    });
    redirect(`/login?${search.toString()}`);
  }

  const role = await fetchUserRole(supabase, user.id);
  if (role !== "admin") {
    redirect("/dashboard");
  }

  const adminClient = createSupabaseAdminClient();

  // Load institution by slug. The institutions table currently has columns
  // id, name, slug, contact_email, created_at, updated_at — see
  // 05-03-SUMMARY.md for the rationale on the missing contact_phone column.
  const { data: institution, error: instErr } = await adminClient
    .from("institutions")
    .select("id, slug, name, contact_email, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (instErr) {
    logger.error("Falha ao carregar instituição", {
      slug,
      error: instErr.message,
    });
  }
  if (!institution) {
    notFound();
  }

  const inst = institution as InstitutionRow;

  // Load members (institution_members → profiles)
  const { data: members } = await adminClient
    .from("institution_members")
    .select("profile_id, role, created_at, profiles!inner(full_name)")
    .eq("institution_id", inst.id)
    .order("created_at", { ascending: false });

  const memberRows = (members as unknown as MemberJoinRow[] | null) ?? [];

  // Load emails for member profiles via auth.admin.listUsers — profiles has
  // no email column, so we cross-reference by id.
  const { data: allAuthUsers } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const emailById = new Map(
    (allAuthUsers?.users ?? []).map((u) => [u.id, u.email ?? ""]),
  );

  const membersWithProfile: InstitutionMemberWithProfile[] = memberRows.map(
    (m) => ({
      profileId: m.profile_id,
      fullName: m.profiles?.full_name ?? "—",
      email: emailById.get(m.profile_id) ?? "",
      role: m.role === "manager" ? "manager" : "student",
      attachedAt: m.created_at,
    }),
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-base font-semibold text-slate-900">
            Gestão de Incidentes ·{" "}
            <span className="font-normal text-slate-500">Área restrita (admin)</span>
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            INSTITUIÇÕES
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{inst.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{inst.slug}</p>
          <div className="mt-2">
            <Breadcrumb
              items={[
                { label: "Instituições", href: "/admin/instituicoes" },
                { label: inst.name },
              ]}
            />
          </div>
        </div>
        <InstitutionManager institution={inst} members={membersWithProfile} />
      </main>
    </div>
  );
}
