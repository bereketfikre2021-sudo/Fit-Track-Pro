-- ============================================================
--  Migration 009 — workout_templates
--  Saved reusable workout plans (exercises stored as JSONB).
-- ============================================================

create table if not exists public.workout_templates (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  name        text        not null,
  description text,
  exercises   jsonb       not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.workout_templates is
  'User-saved reusable workout templates. Exercises stored as JSONB for flexibility.';

create trigger trg_templates_updated_at
  before update on public.workout_templates
  for each row execute procedure public.set_updated_at();

alter table public.workout_templates enable row level security;

create policy "templates_all_own"
  on public.workout_templates for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
