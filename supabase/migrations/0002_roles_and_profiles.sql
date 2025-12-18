-- User roles enum
create type if not exists public.user_role as enum ('student', 'admin');

-- Profiles table linked to auth.users to store roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Allow users to read their own profile
create policy "Users can read own profile" on public.profiles
  for select
  using (auth.uid() = id);

-- Allow users to create their own profile as student
create policy "Users can create profile as student" on public.profiles
  for insert
  with check (auth.uid() = id and role = 'student');

-- Allow service role to manage profiles (used for promoting admins)
create policy "Service role can manage profiles" on public.profiles
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Helper expression: treat missing profile as student (but only when authenticated)
-- RLS policies below rely on coalesce to avoid blocking users without a profile row.

-- Courses visibility and management
alter table public.courses enable row level security;

create policy "Roles can read courses" on public.courses
  for select
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and coalesce((select role from public.profiles where id = auth.uid()), 'student'::public.user_role) in ('student', 'admin')
    )
  );

create policy "Admins manage courses" on public.courses
  for all
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  );

-- Modules visibility and management
alter table public.modules enable row level security;

create policy "Roles can read modules" on public.modules
  for select
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and coalesce((select role from public.profiles where id = auth.uid()), 'student'::public.user_role) in ('student', 'admin')
    )
  );

create policy "Admins manage modules" on public.modules
  for all
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  );

-- Lessons visibility and management
alter table public.lessons enable row level security;

create policy "Roles can read lessons" on public.lessons
  for select
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and coalesce((select role from public.profiles where id = auth.uid()), 'student'::public.user_role) in ('student', 'admin')
    )
  );

create policy "Admins manage lessons" on public.lessons
  for all
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  );

-- Materials visibility and management
alter table public.materials enable row level security;

create policy "Roles can read materials" on public.materials
  for select
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and coalesce((select role from public.profiles where id = auth.uid()), 'student'::public.user_role) in ('student', 'admin')
    )
  );

create policy "Admins manage materials" on public.materials
  for all
  using (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or (
      auth.uid() is not null
      and (select role from public.profiles where id = auth.uid()) = 'admin'
    )
  );
