alter table public.courses
  add column if not exists cover_image_url text;

alter table public.materials
  add column if not exists description text;
