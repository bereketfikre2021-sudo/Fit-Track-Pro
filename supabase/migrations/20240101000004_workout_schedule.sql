-- ============================================================
--  Migration 005 — workout_schedule table
--  Weekly recurring plan: exercises assigned to days.
-- ============================================================

create table if not exists public.workout_schedule (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  day_of_week   text        not null
                  check (day_of_week in
                    ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  exercise_id   uuid        not null references public.exercises(id) on delete cascade,
  sort_order    integer     not null default 0,
  sets          integer     not null default 3 check (sets > 0),
  reps          text        not null default '10',  -- text allows ranges like "8-12"
  rest_seconds  integer              default 60,
  is_time_based boolean     not null default false,
  duration_sec  integer,                            -- for timed exercises
  phase         text        check (phase in ('warmup','main','cooldown')),
  notes         text,
  created_at    timestamptz not null default now(),
  unique (user_id, day_of_week, exercise_id)
);

comment on table public.workout_schedule is
  'Weekly recurring workout schedule — one row per exercise per day.';

create index idx_schedule_user_day on public.workout_schedule(user_id, day_of_week);

-- Row-Level Security
alter table public.workout_schedule enable row level security;

create policy "schedule_all_own"
  on public.workout_schedule for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
