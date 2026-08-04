-- ============================================================
--  FitTrack Pro — Supabase PostgreSQL Schema
--  Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID helper (already available in Supabase by default)
create extension if not exists "pgcrypto";

-- ============================================================
--  1. USERS
--  Extends Supabase auth.users — one row per authenticated user.
-- ============================================================
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text          not null default '',
  birth_date      date,
  gender          text          check (gender in ('male', 'female', 'other')),
  height_cm       numeric(5,1)  check (height_cm  > 0),
  current_weight_kg numeric(5,1) check (current_weight_kg > 0),
  target_weight_kg  numeric(5,1) check (target_weight_kg  > 0),
  fitness_goal    text          check (fitness_goal in ('strength','muscle','fat','endurance')),
  fitness_level   text          check (fitness_level in ('beginner','intermediate','advanced')),
  focus_area      text          check (focus_area in ('full-body','upper','lower','core')),
  equipment       text[]        not null default '{}',
  workout_days    text[]        not null default '{}',
  avatar_url      text,
  registration_date date        not null default current_date,
  updated_at      timestamptz   not null default now()
);

comment on table public.users is
  'Profile data for every authenticated FitTrack Pro user.';

-- Auto-update updated_at on every write
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- Row-Level Security
alter table public.users enable row level security;

create policy "Users can read their own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update
  using (auth.uid() = id);


-- ============================================================
--  2. EXERCISE LIBRARY
--  Shared catalogue of exercises (preset + user-custom).
-- ============================================================
create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete cascade,
  -- NULL user_id = global preset; non-NULL = user's custom exercise
  name            text         not null,
  muscle_group    text,
  equipment       text,
  phase           text         check (phase in ('warmup','main','cooldown')),
  is_time_based   boolean      not null default false,
  notes           text,
  image_url       text,
  created_at      timestamptz  not null default now()
);

comment on table public.exercises is
  'Global preset exercises (user_id IS NULL) and user-created custom exercises.';

create index idx_exercises_user_id   on public.exercises(user_id);
create index idx_exercises_muscle    on public.exercises(muscle_group);

alter table public.exercises enable row level security;

-- Everyone can read presets; users can only read their own custom ones
create policy "Read global presets or own exercises"
  on public.exercises for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can create their own exercises"
  on public.exercises for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own exercises"
  on public.exercises for update
  using (auth.uid() = user_id);

create policy "Users can delete their own exercises"
  on public.exercises for delete
  using (auth.uid() = user_id);


-- ============================================================
--  3. WORKOUT SCHEDULE
--  Weekly plan: which exercises are scheduled on which day.
-- ============================================================
create table if not exists public.workout_schedule (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  day_of_week     text         not null
                    check (day_of_week in
                      ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  exercise_id     uuid         not null references public.exercises(id) on delete cascade,
  sort_order      integer      not null default 0,
  sets            integer      not null default 3 check (sets > 0),
  reps            text         not null default '10',   -- text to allow ranges like "8-12"
  rest_seconds    integer               default 60,
  is_time_based   boolean      not null default false,
  duration_sec    integer,                              -- for timed exercises
  phase           text         check (phase in ('warmup','main','cooldown')),
  notes           text,
  created_at      timestamptz  not null default now(),
  unique (user_id, day_of_week, exercise_id)
);

comment on table public.workout_schedule is
  'Weekly recurring workout schedule — one row per exercise-per-day.';

create index idx_schedule_user_day on public.workout_schedule(user_id, day_of_week);

alter table public.workout_schedule enable row level security;

create policy "Users manage their own schedule"
  on public.workout_schedule for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  4. WORKOUT SESSIONS
--  A completed (or skipped) workout session on a specific date.
-- ============================================================
create table if not exists public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  day_of_week     text         not null,
  session_date    date         not null,
  started_at      timestamptz  not null,
  ended_at        timestamptz,
  completed_count integer      not null default 0,
  total_count     integer      not null default 0,
  skipped         boolean      not null default false,
  skip_reason     text,
  notes           text,
  created_at      timestamptz  not null default now(),
  unique (user_id, day_of_week, session_date)
);

comment on table public.workout_sessions is
  'One row per completed or skipped workout session.';

create index idx_sessions_user_date on public.workout_sessions(user_id, session_date desc);

alter table public.workout_sessions enable row level security;

create policy "Users manage their own sessions"
  on public.workout_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  5. EXERCISE LOGS  (sets · reps · weight per exercise per session)
-- ============================================================
create table if not exists public.exercise_logs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid         not null references public.workout_sessions(id) on delete cascade,
  user_id         uuid         not null references public.users(id) on delete cascade,
  exercise_id     uuid         not null references public.exercises(id) on delete set null,
  log_date        date         not null,
  completed_at    timestamptz,
  skipped         boolean      not null default false,
  skip_reason     text,
  phase           text         check (phase in ('warmup','main','cooldown')),
  notes           text,
  created_at      timestamptz  not null default now()
);

comment on table public.exercise_logs is
  'Per-exercise completion record within a session.';

create index idx_exercise_logs_session  on public.exercise_logs(session_id);
create index idx_exercise_logs_user     on public.exercise_logs(user_id, log_date desc);
create index idx_exercise_logs_exercise on public.exercise_logs(exercise_id);

alter table public.exercise_logs enable row level security;

create policy "Users manage their own exercise logs"
  on public.exercise_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  6. SETS  (individual set rows for each exercise log)
-- ============================================================
create table if not exists public.sets (
  id              uuid primary key default gen_random_uuid(),
  exercise_log_id uuid         not null references public.exercise_logs(id) on delete cascade,
  user_id         uuid         not null references public.users(id) on delete cascade,
  set_number      integer      not null check (set_number > 0),
  reps            integer               check (reps >= 0),
  weight_kg       numeric(6,2)          check (weight_kg >= 0),
  duration_sec    integer               check (duration_sec >= 0),  -- for timed sets
  rpe             smallint              check (rpe between 1 and 10),
  created_at      timestamptz  not null default now(),
  unique (exercise_log_id, set_number)
);

comment on table public.sets is
  'Individual sets logged within an exercise_log entry.';

create index idx_sets_exercise_log on public.sets(exercise_log_id);
create index idx_sets_user         on public.sets(user_id);

alter table public.sets enable row level security;

create policy "Users manage their own sets"
  on public.sets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  7. MEAL PLANS  (weekly recurring meal template)
-- ============================================================
create table if not exists public.meal_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  day_of_week     text         not null
                    check (day_of_week in
                      ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_slot       text         not null
                    check (meal_slot in
                      ('breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed')),
  food_name       text         not null,
  calories        numeric(7,1) check (calories >= 0),
  protein_g       numeric(6,1) check (protein_g >= 0),
  carbs_g         numeric(6,1) check (carbs_g >= 0),
  fat_g           numeric(6,1) check (fat_g >= 0),
  serving_size    text,
  notes           text,
  sort_order      integer      not null default 0,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table public.meal_plans is
  'Weekly repeating meal plan — one row per food item per slot per day.';

create index idx_meal_plans_user_day on public.meal_plans(user_id, day_of_week);

create trigger trg_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute procedure public.set_updated_at();

alter table public.meal_plans enable row level security;

create policy "Users manage their own meal plans"
  on public.meal_plans for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  8. NUTRITION LOGS  (actual food eaten on a specific date)
-- ============================================================
create table if not exists public.nutrition_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  log_date        date         not null,
  meal_slot       text         not null
                    check (meal_slot in
                      ('breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed')),
  food_name       text         not null,
  calories        numeric(7,1) check (calories >= 0),
  protein_g       numeric(6,1) check (protein_g >= 0),
  carbs_g         numeric(6,1) check (carbs_g >= 0),
  fat_g           numeric(6,1) check (fat_g >= 0),
  serving_size    text,
  notes           text,
  logged_at       timestamptz  not null default now()
);

comment on table public.nutrition_logs is
  'Actual meals consumed on a specific date (daily food diary).';

create index idx_nutrition_logs_user_date on public.nutrition_logs(user_id, log_date desc);

alter table public.nutrition_logs enable row level security;

create policy "Users manage their own nutrition logs"
  on public.nutrition_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  9. BODY LOGS  (weight history → BMI computed automatically)
-- ============================================================
create table if not exists public.body_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  log_date        date         not null,
  weight_kg       numeric(5,1) not null check (weight_kg > 0),
  -- BMI is derived: weight_kg / (height_m)^2
  -- Stored as generated column so it's always consistent.
  -- height_cm is pulled from the users table via a view (see below).
  bmi             numeric(5,2),   -- populated by trigger (see below)
  body_fat_pct    numeric(4,1)    check (body_fat_pct between 0 and 100),
  notes           text,
  created_at      timestamptz  not null default now(),
  unique (user_id, log_date)        -- one entry per day per user
);

comment on table public.body_logs is
  'Daily body-weight check-ins. BMI is auto-calculated on insert/update.';

create index idx_body_logs_user_date on public.body_logs(user_id, log_date desc);

-- Trigger: auto-calculate BMI from the user's stored height
create or replace function public.calc_bmi()
returns trigger language plpgsql as $$
declare
  h_cm numeric;
  h_m  numeric;
begin
  select height_cm into h_cm from public.users where id = new.user_id;
  if h_cm is not null and h_cm > 0 then
    h_m := h_cm / 100.0;
    new.bmi := round((new.weight_kg / (h_m * h_m))::numeric, 2);
  end if;
  return new;
end;
$$;

create trigger trg_body_logs_bmi
  before insert or update on public.body_logs
  for each row execute procedure public.calc_bmi();

alter table public.body_logs enable row level security;

create policy "Users manage their own body logs"
  on public.body_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  10. WATER LOGS  (daily cup count)
-- ============================================================
create table if not exists public.water_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  log_date        date         not null,
  cups            integer      not null default 0 check (cups >= 0),
  goal_cups       integer      not null default 8  check (goal_cups > 0),
  updated_at      timestamptz  not null default now(),
  unique (user_id, log_date)
);

comment on table public.water_logs is
  'Daily water intake tracking — one row per user per day.';

create trigger trg_water_logs_updated_at
  before update on public.water_logs
  for each row execute procedure public.set_updated_at();

alter table public.water_logs enable row level security;

create policy "Users manage their own water logs"
  on public.water_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  11. WORKOUT TEMPLATES  (saved reusable workout plans)
-- ============================================================
create table if not exists public.workout_templates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,
  name            text         not null,
  description     text,
  exercises       jsonb        not null default '[]',  -- snapshot array of exercise config
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table public.workout_templates is
  'User-saved reusable workout templates (stored as JSONB for flexibility).';

create trigger trg_templates_updated_at
  before update on public.workout_templates
  for each row execute procedure public.set_updated_at();

alter table public.workout_templates enable row level security;

create policy "Users manage their own templates"
  on public.workout_templates for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ============================================================
--  12. HELPER VIEW — daily macro totals
-- ============================================================
create or replace view public.v_daily_macros as
select
  user_id,
  log_date,
  round(sum(calories)::numeric,  1) as total_calories,
  round(sum(protein_g)::numeric, 1) as total_protein_g,
  round(sum(carbs_g)::numeric,   1) as total_carbs_g,
  round(sum(fat_g)::numeric,     1) as total_fat_g,
  count(*)                          as food_items
from public.nutrition_logs
group by user_id, log_date;

comment on view public.v_daily_macros is
  'Aggregated daily nutrition totals per user per date.';


-- ============================================================
--  13. HELPER VIEW — personal records (max weight per exercise)
-- ============================================================
create or replace view public.v_personal_records as
select
  el.user_id,
  el.exercise_id,
  e.name             as exercise_name,
  max(s.weight_kg)   as max_weight_kg,
  max(s.reps)        as max_reps,
  max(el.log_date)   as last_performed_date
from public.sets s
join public.exercise_logs el on el.id = s.exercise_log_id
join public.exercises      e  on e.id  = el.exercise_id
where s.weight_kg is not null
group by el.user_id, el.exercise_id, e.name;

comment on view public.v_personal_records is
  'All-time personal records (max weight and reps) per exercise per user.';


-- ============================================================
--  14. AUTO-CREATE USER PROFILE on sign-up
--  Supabase fires this via a database trigger on auth.users.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, registration_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    current_date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop if exists to allow re-running this script safely
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
