-- ============================================================
--  Migration 006 — workout_sessions, exercise_logs, sets
--  Three related tables created together (foreign-key order).
-- ============================================================

-- ── workout_sessions ─────────────────────────────────────────
create table if not exists public.workout_sessions (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.users(id) on delete cascade,
  day_of_week      text        not null,
  session_date     date        not null,
  started_at       timestamptz not null,
  ended_at         timestamptz,
  completed_count  integer     not null default 0,
  total_count      integer     not null default 0,
  skipped          boolean     not null default false,
  skip_reason      text,
  notes            text,
  created_at       timestamptz not null default now(),
  unique (user_id, day_of_week, session_date)
);

comment on table public.workout_sessions is
  'One row per completed or skipped workout session.';

create index idx_sessions_user_date
  on public.workout_sessions(user_id, session_date desc);

alter table public.workout_sessions enable row level security;

create policy "sessions_all_own"
  on public.workout_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── exercise_logs ─────────────────────────────────────────────
create table if not exists public.exercise_logs (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null references public.workout_sessions(id) on delete cascade,
  user_id       uuid        not null references public.users(id) on delete cascade,
  exercise_id   uuid        references public.exercises(id) on delete set null,
  log_date      date        not null,
  completed_at  timestamptz,
  skipped       boolean     not null default false,
  skip_reason   text,
  phase         text        check (phase in ('warmup','main','cooldown')),
  notes         text,
  created_at    timestamptz not null default now()
);

comment on table public.exercise_logs is
  'Per-exercise completion record within a session.';

create index idx_exercise_logs_session  on public.exercise_logs(session_id);
create index idx_exercise_logs_user     on public.exercise_logs(user_id, log_date desc);
create index idx_exercise_logs_exercise on public.exercise_logs(exercise_id);

alter table public.exercise_logs enable row level security;

create policy "exercise_logs_all_own"
  on public.exercise_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── sets ──────────────────────────────────────────────────────
create table if not exists public.sets (
  id               uuid         primary key default gen_random_uuid(),
  exercise_log_id  uuid         not null references public.exercise_logs(id) on delete cascade,
  user_id          uuid         not null references public.users(id) on delete cascade,
  set_number       integer      not null check (set_number > 0),
  reps             integer               check (reps >= 0),
  weight_kg        numeric(6,2)          check (weight_kg >= 0),
  duration_sec     integer               check (duration_sec >= 0),
  rpe              smallint              check (rpe between 1 and 10),
  created_at       timestamptz  not null default now(),
  unique (exercise_log_id, set_number)
);

comment on table public.sets is
  'Individual sets logged within an exercise_log entry (reps, weight, duration, RPE).';

create index idx_sets_exercise_log on public.sets(exercise_log_id);
create index idx_sets_user         on public.sets(user_id);

alter table public.sets enable row level security;

create policy "sets_all_own"
  on public.sets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
