create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
        full_name = coalesce(excluded.full_name, profiles.full_name),
        updated_at = now();
  exception
    when others then
      raise warning 'handle_auth_user_profile failed for user % (%): %', new.id, sqlstate, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_auth_user_profile();
