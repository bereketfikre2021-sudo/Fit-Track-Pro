-- ============================================================
--  Migration: Patch nullable user_id on system/preset tables
--  Preset exercises, workout templates, foods, and bmi_programs
--  are global rows with no owner — user_id must be nullable.
-- ============================================================

-- workout_templates: allow null user_id for global/preset templates
alter table public.workout_templates
  alter column user_id drop not null;

-- exercises: allow null user_id for global/preset exercises (if not already)
alter table public.exercises
  alter column user_id drop not null;

-- foods: allow null user_id for global/preset foods (if not already)
alter table public.foods
  alter column user_id drop not null;

-- ethiopian_foods: food_id is a FK to foods(id), id is the PK
-- The on conflict (id) clause in seed.sql is correct for this table.

-- bmi_programs: no user_id column, no change needed.
