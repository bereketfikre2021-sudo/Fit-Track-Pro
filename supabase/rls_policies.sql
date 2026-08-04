-- ============================================================
--  FitTrack Pro — Row Level Security audit & hardened policies
--
--  Run this in: Supabase Dashboard → SQL Editor → New query
--
--  What this fixes vs the original deploy.sql:
--    1. users        — adds missing DELETE policy
--    2. exercises    — splits INSERT check to block preset insertion
--                      (users cannot create rows with user_id = NULL)
--    3. All tables   — replaces broad ALL policies with explicit
--                      SELECT / INSERT / UPDATE / DELETE policies
--                      so each operation's intent is crystal clear
--
--  All policies are idempotent (drop if exists before create).
-- ============================================================


-- ============================================================
--  1. users
--  The primary key IS the auth.uid(), so every check is simple.
-- ============================================================

alter table public.users enable row level security;

drop policy if exists "users_select_own"   on public.users;
drop policy if exists "users_insert_own"   on public.users;
drop policy if exists "users_update_own"   on public.users;
drop policy if exists "users_delete_own"   on public.users;

-- Read own profile only
create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);

-- Create own profile (handle_new_user trigger uses security definer,
-- but a direct insert from the client must also pass this check)
create policy "users_insert_own"
  on public.users
  for insert
  with check (auth.uid() = id);

-- Update own profile
create policy "users_update_own"
  on public.users
  for update
  using     (auth.uid() = id)
  with check (auth.uid() = id);

-- Delete own profile (cascades to all child rows via FK)
create policy "users_delete_own"
  on public.users
  for delete
  using (auth.uid() = id);


-- ============================================================
--  2. exercises
--  Global presets (user_id IS NULL) are readable by everyone.
--  Only the owning user can mutate their custom exercises.
--  No user can insert a row pretending to be a global preset.
-- ============================================================

alter table public.exercises enable row level security;

drop policy if exists "exercises_read_global_or_own" on public.exercises;
drop policy if exists "exercises_insert_own"         on public.exercises;
drop policy if exists "exercises_update_own"         on public.exercises;
drop policy if exists "exercises_delete_own"         on public.exercises;

-- Read: global presets OR own custom exercises
create policy "exercises_select_global_or_own"
  on public.exercises
  for select
  using (user_id is null or auth.uid() = user_id);

-- Insert: must set user_id to own uid — cannot create global presets
create policy "exercises_insert_own"
  on public.exercises
  for insert
  with check (
    auth.uid() = user_id   -- user_id must equal caller; NULL is rejected
  );

-- Update: own custom exercises only (presets have user_id NULL → never matches)
create policy "exercises_update_own"
  on public.exercises
  for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: own custom exercises only
create policy "exercises_delete_own"
  on public.exercises
  for delete
  using (auth.uid() = user_id);


-- ============================================================
--  3. workout_schedule
-- ============================================================

alter table public.workout_schedule enable row level security;

drop policy if exists "schedule_all_own"    on public.workout_schedule;
drop policy if exists "schedule_select_own" on public.workout_schedule;
drop policy if exists "schedule_insert_own" on public.workout_schedule;
drop policy if exists "schedule_update_own" on public.workout_schedule;
drop policy if exists "schedule_delete_own" on public.workout_schedule;

create policy "schedule_select_own"
  on public.workout_schedule for select
  using (auth.uid() = user_id);

create policy "schedule_insert_own"
  on public.workout_schedule for insert
  with check (auth.uid() = user_id);

create policy "schedule_update_own"
  on public.workout_schedule for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "schedule_delete_own"
  on public.workout_schedule for delete
  using (auth.uid() = user_id);


-- ============================================================
--  4. workout_sessions
-- ============================================================

alter table public.workout_sessions enable row level security;

drop policy if exists "sessions_all_own"    on public.workout_sessions;
drop policy if exists "sessions_select_own" on public.workout_sessions;
drop policy if exists "sessions_insert_own" on public.workout_sessions;
drop policy if exists "sessions_update_own" on public.workout_sessions;
drop policy if exists "sessions_delete_own" on public.workout_sessions;

create policy "sessions_select_own"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "sessions_insert_own"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions_update_own"
  on public.workout_sessions for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions_delete_own"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);


-- ============================================================
--  5. exercise_logs
-- ============================================================

alter table public.exercise_logs enable row level security;

drop policy if exists "exercise_logs_all_own"    on public.exercise_logs;
drop policy if exists "exercise_logs_select_own" on public.exercise_logs;
drop policy if exists "exercise_logs_insert_own" on public.exercise_logs;
drop policy if exists "exercise_logs_update_own" on public.exercise_logs;
drop policy if exists "exercise_logs_delete_own" on public.exercise_logs;

create policy "exercise_logs_select_own"
  on public.exercise_logs for select
  using (auth.uid() = user_id);

create policy "exercise_logs_insert_own"
  on public.exercise_logs for insert
  with check (auth.uid() = user_id);

create policy "exercise_logs_update_own"
  on public.exercise_logs for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "exercise_logs_delete_own"
  on public.exercise_logs for delete
  using (auth.uid() = user_id);


-- ============================================================
--  6. sets
-- ============================================================

alter table public.sets enable row level security;

drop policy if exists "sets_all_own"    on public.sets;
drop policy if exists "sets_select_own" on public.sets;
drop policy if exists "sets_insert_own" on public.sets;
drop policy if exists "sets_update_own" on public.sets;
drop policy if exists "sets_delete_own" on public.sets;

create policy "sets_select_own"
  on public.sets for select
  using (auth.uid() = user_id);

create policy "sets_insert_own"
  on public.sets for insert
  with check (auth.uid() = user_id);

create policy "sets_update_own"
  on public.sets for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sets_delete_own"
  on public.sets for delete
  using (auth.uid() = user_id);


-- ============================================================
--  7. meal_plans
-- ============================================================

alter table public.meal_plans enable row level security;

drop policy if exists "meal_plans_all_own"    on public.meal_plans;
drop policy if exists "meal_plans_select_own" on public.meal_plans;
drop policy if exists "meal_plans_insert_own" on public.meal_plans;
drop policy if exists "meal_plans_update_own" on public.meal_plans;
drop policy if exists "meal_plans_delete_own" on public.meal_plans;

create policy "meal_plans_select_own"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "meal_plans_insert_own"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "meal_plans_update_own"
  on public.meal_plans for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_plans_delete_own"
  on public.meal_plans for delete
  using (auth.uid() = user_id);


-- ============================================================
--  8. nutrition_logs
-- ============================================================

alter table public.nutrition_logs enable row level security;

drop policy if exists "nutrition_logs_all_own"    on public.nutrition_logs;
drop policy if exists "nutrition_logs_select_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_insert_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_update_own" on public.nutrition_logs;
drop policy if exists "nutrition_logs_delete_own" on public.nutrition_logs;

create policy "nutrition_logs_select_own"
  on public.nutrition_logs for select
  using (auth.uid() = user_id);

create policy "nutrition_logs_insert_own"
  on public.nutrition_logs for insert
  with check (auth.uid() = user_id);

create policy "nutrition_logs_update_own"
  on public.nutrition_logs for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "nutrition_logs_delete_own"
  on public.nutrition_logs for delete
  using (auth.uid() = user_id);


-- ============================================================
--  9. body_logs
-- ============================================================

alter table public.body_logs enable row level security;

drop policy if exists "body_logs_all_own"    on public.body_logs;
drop policy if exists "body_logs_select_own" on public.body_logs;
drop policy if exists "body_logs_insert_own" on public.body_logs;
drop policy if exists "body_logs_update_own" on public.body_logs;
drop policy if exists "body_logs_delete_own" on public.body_logs;

create policy "body_logs_select_own"
  on public.body_logs for select
  using (auth.uid() = user_id);

create policy "body_logs_insert_own"
  on public.body_logs for insert
  with check (auth.uid() = user_id);

create policy "body_logs_update_own"
  on public.body_logs for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "body_logs_delete_own"
  on public.body_logs for delete
  using (auth.uid() = user_id);


-- ============================================================
--  10. water_logs
-- ============================================================

alter table public.water_logs enable row level security;

drop policy if exists "water_logs_all_own"    on public.water_logs;
drop policy if exists "water_logs_select_own" on public.water_logs;
drop policy if exists "water_logs_insert_own" on public.water_logs;
drop policy if exists "water_logs_update_own" on public.water_logs;
drop policy if exists "water_logs_delete_own" on public.water_logs;

create policy "water_logs_select_own"
  on public.water_logs for select
  using (auth.uid() = user_id);

create policy "water_logs_insert_own"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

create policy "water_logs_update_own"
  on public.water_logs for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "water_logs_delete_own"
  on public.water_logs for delete
  using (auth.uid() = user_id);


-- ============================================================
--  11. workout_templates
-- ============================================================

alter table public.workout_templates enable row level security;

drop policy if exists "templates_all_own"    on public.workout_templates;
drop policy if exists "templates_select_own" on public.workout_templates;
drop policy if exists "templates_insert_own" on public.workout_templates;
drop policy if exists "templates_update_own" on public.workout_templates;
drop policy if exists "templates_delete_own" on public.workout_templates;

create policy "templates_select_own"
  on public.workout_templates for select
  using (auth.uid() = user_id);

create policy "templates_insert_own"
  on public.workout_templates for insert
  with check (auth.uid() = user_id);

create policy "templates_update_own"
  on public.workout_templates for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "templates_delete_own"
  on public.workout_templates for delete
  using (auth.uid() = user_id);


-- ============================================================
--  Verification query — run after applying to confirm coverage
-- ============================================================
--
-- select
--   schemaname,
--   tablename,
--   policyname,
--   cmd,
--   qual,
--   with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, cmd;
--
-- ============================================================
