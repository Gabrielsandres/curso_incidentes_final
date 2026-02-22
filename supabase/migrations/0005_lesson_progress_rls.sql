alter table public.lesson_progress enable row level security;

drop policy if exists "Users can read own lesson progress" on public.lesson_progress;
create policy "Users can read own lesson progress"
  on public.lesson_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own lesson progress" on public.lesson_progress;
create policy "Users can insert own lesson progress"
  on public.lesson_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own lesson progress" on public.lesson_progress;
create policy "Users can update own lesson progress"
  on public.lesson_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages lesson progress" on public.lesson_progress;
create policy "Service role manages lesson progress"
  on public.lesson_progress
  for all
  to service_role
  using (true)
  with check (true);
