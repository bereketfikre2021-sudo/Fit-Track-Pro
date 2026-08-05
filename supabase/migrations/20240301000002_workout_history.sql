-- ============================================================
--  Migration: Workout History (extended)
-- ============================================================

-- ── workout_sessions extended columns ────────────────────────────────────────
alter table public.workout_sessions
  add column if not exists template_id   uuid references public.workout_templates(id) on delete set null,
  add column if not exists calories_burned integer,
  add column if not exists avg_heart_rate  integer,
  add column if not exists max_heart_rate  integer,
  add column if not exists perceived_effort smallint check (perceived_effort between 1 and 10),
  add column if not exists mood            smallint check (mood between 1 and 5),
  add column if not exists weather         text,
  add column if not exists location        text,
  add column if not exists notes           text,
  add column if not exists deleted_at      timestamptz;

create index if not exists idx_sessions_template_id on public.workout_sessions(template_id) where template_id is not null;
create index if not exists idx_sessions_deleted_at  on public.workout_sessions(deleted_at) where deleted_at is null;

-- ── personal_records ─────────────────────────────────────────────────────────
create table if not exists public.personal_records (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  record_type     text not null check (record_type in ('max_weight','max_reps','max_volume','max_distance','min_time','max_duration')),
  value           numeric(10,3) not null,
  unit            text not null default 'kg',
  achieved_at     date not null default current_date,
  session_id      uuid references public.workout_sessions(id) on delete set null,
  set_log_id      uuid references public.sets(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (user_id, exercise_id, record_type)  -- only keep the best
);

comment on table public.personal_records is 'All-time personal bests per exercise per record type.';
create index idx_pr_user_id     on public.personal_records(user_id);
create index idx_pr_exercise_id on public.personal_records(exercise_id);
create index idx_pr_achieved_at on public.personal_records(achieved_at desc);

alter table public.personal_records enable row level security;
create policy "Users manage own PRs" on public.personal_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Function: upsert personal record ─────────────────────────────────────────
create or replace function public.upsert_personal_record(
  p_user_id     uuid,
  p_exercise_id uuid,
  p_record_type text,
  p_value       numeric,
  p_unit        text default 'kg',
  p_session_id  uuid default null,
  p_set_id      uuid default null
) returns boolean language plpgsql security definer as $$
declare
  existing_value numeric;
begin
  select value into existing_value
  from public.personal_records
  where user_id = p_user_id and exercise_id = p_exercise_id and record_type = p_record_type;

  if existing_value is null or
     (p_record_type = 'min_time' and p_value < existing_value) or
     (p_record_type != 'min_time' and p_value > existing_value) then
    insert into public.personal_records (user_id, exercise_id, record_type, value, unit, achieved_at, session_id, set_log_id)
    values (p_user_id, p_exercise_id, p_record_type, p_value, p_unit, current_date, p_session_id, p_set_id)
    on conflict (user_id, exercise_id, record_type) do update
      set value = excluded.value, unit = excluded.unit, achieved_at = excluded.achieved_at,
          session_id = excluded.session_id, set_log_id = excluded.set_log_id;
    return true;  -- new PR!
  end if;
  return false;
end;
$$;

-- ── Trigger: auto-check PR after set insert ───────────────────────────────────
create or replace function public.check_pr_after_set()
returns trigger language plpgsql security definer as $$
declare
  v_exercise_id uuid;
  v_user_id     uuid;
  v_session_id  uuid;
begin
  select el.exercise_id, el.user_id, el.session_id
  into v_exercise_id, v_user_id, v_session_id
  from public.exercise_logs el
  where el.id = new.exercise_log_id;

  if v_exercise_id is not null and new.weight_kg is not null and new.reps is not null then
    perform public.upsert_personal_record(v_user_id, v_exercise_id, 'max_weight', new.weight_kg, 'kg', v_session_id, new.id);
    perform public.upsert_personal_record(v_user_id, v_exercise_id, 'max_reps', new.reps, 'reps', v_session_id, new.id);
    perform public.upsert_personal_record(v_user_id, v_exercise_id, 'max_volume', (new.weight_kg * new.reps), 'kg', v_session_id, new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_pr_after_set on public.sets;
create trigger trg_check_pr_after_set
  after insert or update on public.sets
  for each row execute procedure public.check_pr_after_set();

-- ── View: workout summary stats ───────────────────────────────────────────────
create or replace view public.v_workout_summary as
select
  ws.user_id,
  date_trunc('week', ws.session_date)::date as week_start,
  date_trunc('month', ws.session_date)::date as month_start,
  count(*) filter (where not ws.skipped)     as sessions_completed,
  count(*) filter (where ws.skipped)         as sessions_skipped,
  sum(ws.completed_count)                    as total_exercises,
  round(avg(ws.perceived_effort), 1)         as avg_effort,
  sum(ws.calories_burned)                    as total_calories
from public.workout_sessions ws
where ws.deleted_at is null
group by ws.user_id, week_start, month_start;
