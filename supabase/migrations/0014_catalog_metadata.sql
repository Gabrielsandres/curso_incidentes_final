-- 0014_catalog_metadata.sql
-- Aplicar APÓS 0013 estar no banco.
-- Adiciona: lifecycle timestamps em courses (published_at / archived_at),
--           soft delete em modules (deleted_at) e lessons (deleted_at),
--           video metadata em lessons (video_provider / video_external_id / workload_minutes),
--           relaxamento de NOT NULL em lessons.video_url (Phase 4 vai migrar dados),
--           UTMs em institutional_leads (utm_source / utm_medium / utm_campaign),
--           tabela pending_enrollments para convites antecipados (D-10 Opção A),
--           índices de performance para queries comuns,
--           atualização de policy RLS de courses para filtrar arquivados.
--
-- NOTA: coluna legacy lessons.video_url É MANTIDA (Phase 4 vai migrar dados para
--       video_provider/video_external_id; até lá ambas as colunas convivem).
-- NOTA: esta migration é ADITIVA — sem DROP TABLE, sem ALTER COLUMN TYPE incompatível.

-- -----------------------------------------------------------------------
-- 1. Courses: lifecycle timestamps (D-01)
-- -----------------------------------------------------------------------
alter table public.courses
  add column if not exists published_at timestamptz null,
  add column if not exists archived_at  timestamptz null;

-- Índice parcial para query do aluno: WHERE published_at IS NOT NULL AND archived_at IS NULL
create index if not exists idx_courses_published_at
  on public.courses (published_at)
  where archived_at is null;

-- -----------------------------------------------------------------------
-- 2. Modules: soft delete (D-02)
-- -----------------------------------------------------------------------
alter table public.modules
  add column if not exists deleted_at timestamptz null;

create index if not exists idx_modules_deleted_at
  on public.modules (deleted_at)
  where deleted_at is not null;

-- -----------------------------------------------------------------------
-- 3. Lessons: soft delete + video metadata + workload (D-02, D-03)
--    NÃO remover video_url (legacy — Phase 4 migra)
-- -----------------------------------------------------------------------
alter table public.lessons
  add column if not exists deleted_at         timestamptz null,
  add column if not exists video_provider     text        null,
  add column if not exists video_external_id  text        null,
  add column if not exists workload_minutes   integer     null
    constraint lessons_workload_minutes_check check (workload_minutes is null or workload_minutes > 0);

-- Relaxar NOT NULL em video_url: novos providers (Bunny/YouTube) não usam video_url
alter table public.lessons
  alter column video_url drop not null;

create index if not exists idx_lessons_deleted_at
  on public.lessons (deleted_at)
  where deleted_at is not null;

-- -----------------------------------------------------------------------
-- 4. Institutional leads: UTM capture (D-11, MKT-02)
-- -----------------------------------------------------------------------
alter table public.institutional_leads
  add column if not exists utm_source   text null,
  add column if not exists utm_medium   text null,
  add column if not exists utm_campaign text null;

-- Constraints de comprimento máximo (D-11: max 255) — idempotentes via DO $$
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_source_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_source_length
      check (utm_source is null or length(utm_source) <= 255);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_medium_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_medium_length
      check (utm_medium is null or length(utm_medium) <= 255);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'institutional_leads_utm_campaign_length'
  ) then
    alter table public.institutional_leads
      add constraint institutional_leads_utm_campaign_length
      check (utm_campaign is null or length(utm_campaign) <= 255);
  end if;
end $$;

-- -----------------------------------------------------------------------
-- 5. Pending enrollments (D-10, Opção A)
--    Registra intenção de grant enquanto o profile do convidado não existe.
--    Trigger ou Server Action de reconciliação converte para enrollment real
--    quando o usuário aceita o convite e o profile é criado (via trigger 0010).
-- -----------------------------------------------------------------------
create table if not exists public.pending_enrollments (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null,
  course_id   uuid        not null references public.courses(id) on delete cascade,
  invited_by  uuid        null references public.profiles(id) on delete set null,
  expires_at  timestamptz null,  -- expires_at do enrollment que será criado (não da pendência em si)
  created_at  timestamptz not null default now(),
  -- Sem UNIQUE (email, course_id) — permite reenvio de convite para o mesmo email
  -- se o primeiro expirar ou for cancelado. Limpeza manual ou via CRON.
  constraint pending_enrollments_email_check
    check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index if not exists idx_pending_enrollments_email
  on public.pending_enrollments (lower(email));

create index if not exists idx_pending_enrollments_course_id
  on public.pending_enrollments (course_id);

-- RLS em pending_enrollments
alter table public.pending_enrollments enable row level security;

drop policy if exists "Admins manage pending enrollments" on public.pending_enrollments;
create policy "Admins manage pending enrollments"
  on public.pending_enrollments
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Service role manages pending enrollments" on public.pending_enrollments;
create policy "Service role manages pending enrollments"
  on public.pending_enrollments
  for all to service_role
  using (true)
  with check (true);

-- -----------------------------------------------------------------------
-- 6. Courses RLS: atualizar policy de leitura de aluno para filtrar arquivados
--    Aluno não deve ver cursos com archived_at IS NOT NULL (CAT-05, CAT-07, T4)
--    Admin bypassa via OR clause na mesma policy.
--    Usa drop policy if exists antes de criar — padrão idempotente do projeto.
-- -----------------------------------------------------------------------
drop policy if exists "Authenticated users read published courses" on public.courses;
create policy "Authenticated users read published courses"
  on public.courses
  for select to authenticated
  using (
    (published_at is not null and archived_at is null)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
