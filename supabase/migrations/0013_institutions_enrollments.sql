-- 0013_institutions_enrollments.sql
-- Aplicar APOS 0012 ser commitada.
-- Cria: enum enrollment_source, helper is_member_of_institution (SECURITY DEFINER),
--       tabela institutions, tabela institution_members,
--       ALTER ADDITIVE na tabela enrollments existente (D-20 reconciliation),
--       indexes, RLS + policies em todas as tres tabelas, backfill de admins.
--
-- NOTA sobre enrollments: a tabela ja existe desde 0001_initial_schema.sql.
-- Esta migracao e ADITIVA (ALTER TABLE ADD COLUMN IF NOT EXISTS) conforme D-20.
-- Colunas legadas (status, order_id, created_at) sao mantidas sem alteracao.
-- A constraint UNIQUE (user_id, course_id) ja existe desde 0001 -- nao re-adicionada.

-- -----------------------------------------------------------------------
-- 1. Novo tipo enum para origem da matricula (seguro criar no mesmo tx que a tabela)
-- -----------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'enrollment_source'
  ) then
    create type public.enrollment_source as enum (
      'admin_grant',
      'b2b_invite',
      'b2c_purchase'
    );
  end if;
end $$;

-- -----------------------------------------------------------------------
-- 2. Helper SECURITY DEFINER -- deve ser criado ANTES das policies que o chamam
-- -----------------------------------------------------------------------
create or replace function public.is_member_of_institution(p_institution_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_is_member boolean;
begin
  select exists (
    select 1
    from public.institution_members im
    where im.institution_id = p_institution_id
      and im.profile_id = auth.uid()
  )
  into v_is_member;

  return coalesce(v_is_member, false);
exception
  when others then
    return false;
end;
$$;

-- -----------------------------------------------------------------------
-- 3. Tabela institutions
-- -----------------------------------------------------------------------
create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_institutions_slug on public.institutions (slug);

-- -----------------------------------------------------------------------
-- 4. Tabela institution_members
-- -----------------------------------------------------------------------
create table if not exists public.institution_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'manager')),
  created_at timestamptz not null default now(),
  unique (institution_id, profile_id)
);

create index if not exists idx_institution_members_institution_id on public.institution_members (institution_id);
create index if not exists idx_institution_members_profile_id on public.institution_members (profile_id);

-- -----------------------------------------------------------------------
-- 5. ALTER ADITIVO na tabela enrollments existente (D-20)
--    Tabela ja existe desde 0001_initial_schema.sql.
--    UNIQUE (user_id, course_id) ja existe -- NAO re-adicionar.
-- -----------------------------------------------------------------------
alter table public.enrollments
  add column if not exists source public.enrollment_source not null default 'admin_grant',
  add column if not exists granted_at timestamptz not null default now(),
  add column if not exists expires_at timestamptz null,
  add column if not exists institution_id uuid null references public.institutions(id) on delete restrict;

create index if not exists idx_enrollments_institution_id on public.enrollments (institution_id);

-- -----------------------------------------------------------------------
-- 6. Habilitar RLS em todas as tres tabelas
-- -----------------------------------------------------------------------
alter table public.institutions enable row level security;
alter table public.institution_members enable row level security;
-- enrollments: habilitar RLS (ENR-02 requer controle por linha)
alter table public.enrollments enable row level security;

-- -----------------------------------------------------------------------
-- 7. Policies RLS -- enrollments
--    ENR-02: matricula ativa necessaria para acessar aulas
--    ENR-04: matricula expirada perde acesso (verificacao via expires_at)
--    INST-04: todas as policies INSERT/UPDATE tem USING + WITH CHECK
-- -----------------------------------------------------------------------

-- Alunos leem suas proprias matriculas ativas (ENR-02, ENR-04)
drop policy if exists "Students read own enrollments" on public.enrollments;
create policy "Students read own enrollments"
  on public.enrollments
  for select
  to authenticated
  using (
    auth.uid() = user_id
    and (expires_at is null or expires_at > now())
  );

-- Admins leem todas as matriculas
drop policy if exists "Admins read all enrollments" on public.enrollments;
create policy "Admins read all enrollments"
  on public.enrollments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Gestores de instituicao leem matriculas da sua instituicao (ENR-02, ENR-04, Phase 5 compat)
drop policy if exists "Institution managers read institution enrollments" on public.enrollments;
create policy "Institution managers read institution enrollments"
  on public.enrollments
  for select
  to authenticated
  using (
    institution_id is not null
    and is_member_of_institution(institution_id)
    and (expires_at is null or expires_at > now())
  );

-- Admins gerenciam matriculas (INST-04: USING + WITH CHECK)
drop policy if exists "Admins manage enrollments" on public.enrollments;
create policy "Admins manage enrollments"
  on public.enrollments
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Bypass de service role
drop policy if exists "Service role manages enrollments" on public.enrollments;
create policy "Service role manages enrollments"
  on public.enrollments
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------
-- 8. Policies RLS -- institutions (INST-04: USING + WITH CHECK em INSERT/UPDATE/DELETE)
-- -----------------------------------------------------------------------

-- Admins gerenciam instituicoes
drop policy if exists "Admins manage institutions" on public.institutions;
create policy "Admins manage institutions"
  on public.institutions
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Membros leem sua propria instituicao
drop policy if exists "Members read own institution" on public.institutions;
create policy "Members read own institution"
  on public.institutions
  for select
  to authenticated
  using (
    is_member_of_institution(id)
  );

-- Bypass de service role
drop policy if exists "Service role manages institutions" on public.institutions;
create policy "Service role manages institutions"
  on public.institutions
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------
-- 9. Policies RLS -- institution_members (INST-04: USING + WITH CHECK)
-- -----------------------------------------------------------------------

-- Admins gerenciam membros de instituicao
drop policy if exists "Admins manage institution members" on public.institution_members;
create policy "Admins manage institution members"
  on public.institution_members
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Membros leem seu proprio vinculo
drop policy if exists "Members read own membership" on public.institution_members;
create policy "Members read own membership"
  on public.institution_members
  for select
  to authenticated
  using (profile_id = auth.uid());

-- Bypass de service role
drop policy if exists "Service role manages institution members" on public.institution_members;
create policy "Service role manages institution members"
  on public.institution_members
  for all
  to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------
-- 10. Backfill: concede acesso a todos os cursos existentes para admins (D-07)
--     ON CONFLICT DO NOTHING: idempotente -- seguro re-executar.
--     Admins recebem acesso vitalicio (expires_at = NULL).
--     Usuarios nao-admin recebem acesso via UI de admin na Phase 2.
-- -----------------------------------------------------------------------
insert into public.enrollments (user_id, course_id, source, granted_at, expires_at, institution_id)
select
  p.id,
  c.id,
  'admin_grant',
  now(),
  null,
  null
from public.profiles p
cross join public.courses c
where p.role = 'admin'
on conflict (user_id, course_id) do nothing;
