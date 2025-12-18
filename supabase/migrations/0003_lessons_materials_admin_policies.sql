-- Ensure RLS is active for lessons and materials
alter table public.lessons enable row level security;
alter table public.materials enable row level security;

-- Drop broad admin policies to replace with scoped insert/update/delete rules
drop policy if exists "Admins manage lessons" on public.lessons;
drop policy if exists "Admins manage materials" on public.materials;

-- Allow only admins (or the service role) to insert lessons
create policy "admin_insert_lessons" on public.lessons
  for insert
  to authenticated
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Allow only admins (or the service role) to update lessons
create policy "admin_update_lessons" on public.lessons
  for update
  to authenticated
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Allow only admins (or the service role) to delete lessons
create policy "admin_delete_lessons" on public.lessons
  for delete
  to authenticated
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Allow only admins (or the service role) to insert materials
create policy "admin_insert_materials" on public.materials
  for insert
  to authenticated
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Allow only admins (or the service role) to update materials
create policy "admin_update_materials" on public.materials
  for update
  to authenticated
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Allow only admins (or the service role) to delete materials
create policy "admin_delete_materials" on public.materials
  for delete
  to authenticated
  using (
    auth.role() = 'service_role'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );
