-- ============================================================
--  Migration 004 — exercises table (library)
--  user_id NULL  = global preset exercise
--  user_id set   = user-created custom exercise
-- ============================================================

create table if not exists public.exercises (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references public.users(id) on delete cascade,
  name          text        not null,
  muscle_group  text,
  equipment     text,
  phase         text        check (phase in ('warmup','main','cooldown')),
  is_time_based boolean     not null default false,
  notes         text,
  image_url     text,
  created_at    timestamptz not null default now()
);

comment on table public.exercises is
  'Global preset exercises (user_id IS NULL) and user-created custom exercises.';

create index idx_exercises_user_id  on public.exercises(user_id);
create index idx_exercises_muscle   on public.exercises(muscle_group);

-- Row-Level Security
alter table public.exercises enable row level security;

create policy "exercises_read_global_or_own"
  on public.exercises for select
  using (user_id is null or auth.uid() = user_id);

create policy "exercises_insert_own"
  on public.exercises for insert
  with check (auth.uid() = user_id);

create policy "exercises_update_own"
  on public.exercises for update
  using (auth.uid() = user_id);

create policy "exercises_delete_own"
  on public.exercises for delete
  using (auth.uid() = user_id);
