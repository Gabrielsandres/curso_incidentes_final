-- 0015_promote_institution_manager_rpc.sql
-- Phase 5 (B2B Institution Manager): atomic promote/demote of institution managers.
--
-- NOTE: Originally specified in plan 05-01 as 0014_promote_institution_manager_rpc.sql.
-- Renumbered to 0015 because 0014_catalog_metadata.sql already exists on disk
-- (shipped during Phase 4 work). Migration numbering must be unique and sequential
-- per CLAUDE.md §Database "no automated runner" convention. Content identical to
-- plan spec — only the filename and README ledger entry differ.
--
-- D-07 (CONTEXT.md): "uma instituição = um gestor por vez". Promoting a new manager
-- must auto-demote the prior manager in the same institution; if the demoted user has
-- no other manager seats globally, also reset their profiles.role back to 'student'.
--
-- Sequential admin-client calls (RESEARCH §Pitfall 3) leave partial-failure states
-- ("two managers in one institution"). PostgREST wraps RPC calls in a single
-- transaction, so any UPDATE failure rolls back the entire procedure.
--
-- SECURITY DEFINER + locked search_path mirrors the pattern of
-- public.is_member_of_institution() shipped in 0013.
-- Execute is granted ONLY to service_role; Server Actions go through the admin
-- client (createSupabaseAdminClient) which uses the service-role key.

-- =====================================================================
-- promote_institution_manager: promote a new manager AND auto-demote the prior one
-- =====================================================================

create or replace function public.promote_institution_manager(
  p_institution_id uuid,
  p_new_manager_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_manager_profile_id uuid;
begin
  -- 1. Find prior manager (if any) IN THIS institution, excluding the promoted user
  select profile_id into v_prior_manager_profile_id
  from public.institution_members
  where institution_id = p_institution_id
    and role = 'manager'
    and profile_id <> p_new_manager_profile_id
  limit 1;

  -- 2. Promote new manager: profiles.role + institution_members.role
  update public.profiles
  set role = 'institution_manager'
  where id = p_new_manager_profile_id;

  update public.institution_members
  set role = 'manager'
  where institution_id = p_institution_id
    and profile_id = p_new_manager_profile_id;

  -- 3. Demote prior manager (if any)
  if v_prior_manager_profile_id is not null then
    update public.institution_members
    set role = 'student'
    where institution_id = p_institution_id
      and profile_id = v_prior_manager_profile_id;

    -- If prior manager has no other manager seats globally, reset profiles.role
    if not exists (
      select 1 from public.institution_members
      where profile_id = v_prior_manager_profile_id
        and role = 'manager'
    ) then
      update public.profiles
      set role = 'student'
      where id = v_prior_manager_profile_id;
    end if;
  end if;
end;
$$;

revoke all on function public.promote_institution_manager(uuid, uuid) from public;
revoke all on function public.promote_institution_manager(uuid, uuid) from anon;
revoke all on function public.promote_institution_manager(uuid, uuid) from authenticated;
grant execute on function public.promote_institution_manager(uuid, uuid) to service_role;

-- =====================================================================
-- demote_institution_manager: demote a manager back to student (UI "Rebaixar a aluno")
-- =====================================================================

create or replace function public.demote_institution_manager(
  p_institution_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Demote in this institution
  update public.institution_members
  set role = 'student'
  where institution_id = p_institution_id
    and profile_id = p_profile_id;

  -- 2. If user has no other manager seats globally, reset profiles.role
  if not exists (
    select 1 from public.institution_members
    where profile_id = p_profile_id
      and role = 'manager'
  ) then
    update public.profiles
    set role = 'student'
    where id = p_profile_id;
  end if;
end;
$$;

revoke all on function public.demote_institution_manager(uuid, uuid) from public;
revoke all on function public.demote_institution_manager(uuid, uuid) from anon;
revoke all on function public.demote_institution_manager(uuid, uuid) from authenticated;
grant execute on function public.demote_institution_manager(uuid, uuid) to service_role;
