alter table public.courses
  add column if not exists certificate_enabled boolean not null default false,
  add column if not exists certificate_template_url text,
  add column if not exists certificate_workload_hours integer,
  add column if not exists certificate_signer_name text,
  add column if not exists certificate_signer_role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_certificate_workload_hours_check'
  ) then
    alter table public.courses
      add constraint courses_certificate_workload_hours_check
      check (certificate_workload_hours is null or certificate_workload_hours > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_certificate_config_when_enabled_check'
  ) then
    alter table public.courses
      add constraint courses_certificate_config_when_enabled_check
      check (
        not certificate_enabled
        or (
          nullif(trim(certificate_template_url), '') is not null
          and certificate_workload_hours is not null
          and certificate_workload_hours > 0
          and nullif(trim(certificate_signer_name), '') is not null
          and nullif(trim(certificate_signer_role), '') is not null
        )
      );
  end if;
end $$;

create table if not exists public.course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  certificate_code text not null unique,
  file_bucket text not null,
  file_path text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes integer not null check (file_size_bytes > 0),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_course_certificates_user_id on public.course_certificates (user_id);
create index if not exists idx_course_certificates_course_id on public.course_certificates (course_id);

alter table public.course_certificates enable row level security;

drop policy if exists "Users can read own course certificates" on public.course_certificates;
create policy "Users can read own course certificates"
  on public.course_certificates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can read course certificates" on public.course_certificates;
create policy "Admins can read course certificates"
  on public.course_certificates
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

drop policy if exists "Service role manages course certificates" on public.course_certificates;
create policy "Service role manages course certificates"
  on public.course_certificates
  for all
  to service_role
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
select 'certificates', 'certificates', false
where not exists (
  select 1
  from storage.buckets
  where id = 'certificates'
);
