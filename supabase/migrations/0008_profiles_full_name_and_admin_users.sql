alter table public.profiles
  add column if not exists full_name text,
  add column if not exists updated_at timestamptz not null default now();

update public.profiles as p
set
  full_name = coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'Aluno'
  ),
  updated_at = now()
from auth.users as u
where
  u.id = p.id
  and (p.full_name is null or trim(p.full_name) = '');

update public.profiles
set full_name = 'Aluno', updated_at = now()
where full_name is null or trim(full_name) = '';

alter table public.profiles
  alter column full_name set not null;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles as p where p.id = auth.uid())
  );

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Aluno'
    ),
    'student'
  )
  on conflict (id) do update
    set
      full_name = coalesce(
        excluded.full_name,
        profiles.full_name
      ),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_profile();
