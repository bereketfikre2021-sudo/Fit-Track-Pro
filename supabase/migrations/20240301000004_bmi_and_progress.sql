-- ============================================================
--  Migration: BMI Programs, Progress Tracking
-- ============================================================

create type public.bmi_category_type as enum ('underweight','normal','overweight','obese_1','obese_2','obese_3');
create type public.program_type      as enum ('weight_loss','muscle_gain','maintenance','endurance','strength','rehabilitation');

-- ── bmi_programs ──────────────────────────────────────────────────────────────
create table if not exists public.bmi_programs (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  program_type        public.program_type not null,
  target_bmi_min      numeric(4,1),
  target_bmi_max      numeric(4,1),
  target_bmi_category public.bmi_category_type,
  duration_weeks      integer,
  weekly_workouts     integer not null default 3,
  difficulty          public.difficulty_level not null default 'beginner',
  features            jsonb not null default '{}',  -- required subscription tier etc
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  meal_plan_template  jsonb,                         -- snapshot of recommended meal structure
  is_active           boolean not null default true,
  is_featured         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.bmi_programs is 'Structured fitness programs linked to BMI categories.';
create index idx_bmi_programs_type       on public.bmi_programs(program_type);
create index idx_bmi_programs_is_active  on public.bmi_programs(is_active) where is_active = true;
create index idx_bmi_programs_difficulty on public.bmi_programs(difficulty);

drop trigger if exists trg_bmi_programs_updated_at on public.bmi_programs;
create trigger trg_bmi_programs_updated_at before update on public.bmi_programs for each row execute procedure public.set_updated_at();

alter table public.bmi_programs enable row level security;
create policy "Anyone reads active BMI programs" on public.bmi_programs for select using (is_active = true);
create policy "Admins manage BMI programs"        on public.bmi_programs for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── user_bmi_programs ─────────────────────────────────────────────────────────
create table if not exists public.user_bmi_programs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  program_id      uuid not null references public.bmi_programs(id) on delete cascade,
  started_at      timestamptz not null default now(),
  target_date     date,
  current_week    integer not null default 1,
  is_completed    boolean not null default false,
  completed_at    timestamptz,
  initial_weight  numeric(5,1),
  initial_bmi     numeric(4,1),
  current_weight  numeric(5,1),
  current_bmi     numeric(4,1),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.user_bmi_programs is 'User enrollment and progress in BMI programs.';
create index idx_user_bmi_programs_user_id    on public.user_bmi_programs(user_id);
create index idx_user_bmi_programs_program_id on public.user_bmi_programs(program_id);

drop trigger if exists trg_user_bmi_programs_updated_at on public.user_bmi_programs;
create trigger trg_user_bmi_programs_updated_at before update on public.user_bmi_programs for each row execute procedure public.set_updated_at();

alter table public.user_bmi_programs enable row level security;
create policy "Users manage own BMI programs" on public.user_bmi_programs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── progress_photos ───────────────────────────────────────────────────────────
create table if not exists public.progress_photos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  storage_path    text not null,
  taken_at        date not null default current_date,
  weight_kg       numeric(5,1),
  bmi             numeric(4,1),
  notes           text,
  is_private      boolean not null default true,
  created_at      timestamptz not null default now()
);

comment on table public.progress_photos is 'User progress photos stored in Supabase Storage.';
create index idx_progress_photos_user on public.progress_photos(user_id, taken_at desc);

alter table public.progress_photos enable row level security;
create policy "Users manage own progress photos" on public.progress_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── body_measurements ─────────────────────────────────────────────────────────
create table if not exists public.body_measurements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  measured_at     date not null default current_date,
  chest_cm        numeric(5,1),
  waist_cm        numeric(5,1),
  hips_cm         numeric(5,1),
  left_arm_cm     numeric(5,1),
  right_arm_cm    numeric(5,1),
  left_thigh_cm   numeric(5,1),
  right_thigh_cm  numeric(5,1),
  neck_cm         numeric(5,1),
  shoulders_cm    numeric(5,1),
  body_fat_pct    numeric(4,1),
  muscle_mass_kg  numeric(5,1),
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, measured_at)
);

comment on table public.body_measurements is 'Full body measurement log.';
create index idx_body_measurements_user on public.body_measurements(user_id, measured_at desc);

alter table public.body_measurements enable row level security;
create policy "Users manage own measurements" on public.body_measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── View: progress overview ───────────────────────────────────────────────────
create or replace view public.v_user_progress as
select
  bl.user_id,
  bl.log_date,
  bl.weight_kg,
  bl.bmi,
  bm.chest_cm,
  bm.waist_cm,
  bm.body_fat_pct
from public.body_logs bl
left join public.body_measurements bm on bm.user_id = bl.user_id and bm.measured_at = bl.log_date
order by bl.log_date desc;
