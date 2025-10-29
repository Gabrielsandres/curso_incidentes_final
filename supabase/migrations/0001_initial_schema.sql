-- Enable pgcrypto to use gen_random_uuid if not already available
create extension if not exists "pgcrypto";

-- Enum definitions
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');
  end if;

  if not exists (select 1 from pg_type where typname = 'enrollment_status') then
    create type enrollment_status as enum ('ACTIVE', 'INACTIVE', 'COMPLETED');
  end if;

  if not exists (select 1 from pg_type where typname = 'lesson_progress_status') then
    create type lesson_progress_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
  end if;

  if not exists (select 1 from pg_type where typname = 'coupon_discount_type') then
    create type coupon_discount_type as enum ('PERCENTAGE', 'FIXED');
  end if;
end $$;

-- Core entities
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  label text not null,
  material_type text not null,
  resource_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_period text not null default 'lifetime',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid references public.plans(id),
  status order_status not null default 'PENDING',
  gateway_id text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_id uuid references public.orders(id),
  status enrollment_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status lesson_progress_status not null default 'NOT_STARTED',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists public.institutional_leads (
  id uuid primary key default gen_random_uuid(),
  organization text not null,
  contact_name text not null,
  email text not null,
  phone text,
  message text,
  headcount integer,
  created_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type coupon_discount_type not null default 'PERCENTAGE',
  discount_value integer not null default 0 check (discount_value >= 0),
  max_redemptions integer,
  redemption_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

-- Audit trigger to keep timestamps in sync
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['courses'] loop
    if not exists (
      select 1
      from information_schema.triggers
      where event_object_table = table_name
        and trigger_name = table_name || '_touch_updated_at'
    ) then
      execute format(
        'create trigger %I_touch_updated_at before update on %I
         for each row execute procedure public.touch_updated_at();',
        table_name,
        table_name
      );
    end if;
  end loop;
end $$;

-- Indexes to support lookups
create index if not exists idx_modules_course_id_position on public.modules (course_id, position);
create index if not exists idx_lessons_module_id_position on public.lessons (module_id, position);
create index if not exists idx_materials_lesson_id on public.materials (lesson_id);
create index if not exists idx_orders_user_id_created_at on public.orders (user_id, created_at desc);
create index if not exists idx_enrollments_user_id on public.enrollments (user_id);
create index if not exists idx_lesson_progress_user on public.lesson_progress (user_id);
