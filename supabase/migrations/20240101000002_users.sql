-- ============================================================
--  Migration 003 — users table
--  One row per Supabase Auth user. Created automatically on
--  sign-up via the handle_new_user() trigger (migration 010).
-- ============================================================

create table if not exists public.users (
  id                  uuid          primary key
                        references auth.users(id) on delete cascade,
  name                text          not null default '',
  birth_date          date,
  gender              text          check (gender in ('male', 'female', 'other')),
  height_cm           numeric(5,1)  check (height_cm > 0),
  current_weight_kg   numeric(5,1)  check (current_weight_kg > 0),
  target_weight_kg    numeric(5,1)  check (target_weight_kg > 0),
  fitness_goal        text          check (fitness_goal in ('strength','muscle','fat','endurance')),
  fitness_level       text          check (fitness_level in ('beginner','intermediate','advanced')),
  focus_area          text          check (focus_area in ('full-body','upper','lower','core')),
  equipment           text[]        not null default '{}',
  workout_days        text[]        not null default '{}',
  avatar_url          text,
  registration_date   date          not null default current_date,
  updated_at          timestamptz   not null default now()
);

comment on table public.users is
  'Profile data for every authenticated FitTrack Pro user.';

-- updated_at trigger
create trigger trg_users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

-- Row-Level Security
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id);
