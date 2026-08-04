-- ============================================================
--  Migration 010 — helper views
-- ============================================================

-- ── Daily macro totals ────────────────────────────────────────
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


-- ── Personal records ──────────────────────────────────────────
create or replace view public.v_personal_records as
select
  el.user_id,
  el.exercise_id,
  e.name            as exercise_name,
  max(s.weight_kg)  as max_weight_kg,
  max(s.reps)       as max_reps,
  max(el.log_date)  as last_performed_date
from  public.sets           s
join  public.exercise_logs  el on el.id = s.exercise_log_id
join  public.exercises      e  on e.id  = el.exercise_id
where s.weight_kg is not null
group by el.user_id, el.exercise_id, e.name;

comment on view public.v_personal_records is
  'All-time personal records (max weight and reps) per exercise per user.';


-- ── Weekly workout summary ────────────────────────────────────
create or replace view public.v_weekly_summary as
select
  user_id,
  date_trunc('week', session_date)::date  as week_start,
  count(*)                                as total_sessions,
  sum(completed_count)                    as total_exercises_completed,
  sum(case when skipped then 1 else 0 end) as sessions_skipped,
  round(avg(
    extract(epoch from (ended_at - started_at)) / 60
  )::numeric, 1)                          as avg_session_minutes
from  public.workout_sessions
where ended_at is not null
group by user_id, week_start;

comment on view public.v_weekly_summary is
  'Per-user weekly workout summary — sessions, exercises completed, average duration.';
