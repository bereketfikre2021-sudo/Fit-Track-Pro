-- ============================================================
--  Migration 008 — body_logs + water_logs (progress tracking)
-- ============================================================

-- ── BMI auto-calculation trigger ─────────────────────────────
create or replace function public.calc_bmi()
returns trigger
language plpgsql
as $$
declare
  h_cm numeric;
  h_m  numeric;
begin
  select height_cm into h_cm
  from   public.users
  where  id = new.user_id;

  if h_cm is not null and h_cm > 0 then
    h_m     := h_cm / 100.0;
    new.bmi := round((new.weight_kg / (h_m * h_m))::numeric, 2);
  end if;

  return new;
end;
$$;


-- ── body_logs ─────────────────────────────────────────────────
create table if not exists public.body_logs (
  id            uuid         primary key default gen_random_uuid(),
  user_id       uuid         not null references public.users(id) on delete cascade,
  log_date      date         not null,
  weight_kg     numeric(5,1) not null check (weight_kg > 0),
  bmi           numeric(5,2),           -- auto-calculated by trigger below
  body_fat_pct  numeric(4,1) check (body_fat_pct between 0 and 100),
  notes         text,
  created_at    timestamptz  not null default now(),
  unique (user_id, log_date)            -- one weigh-in per user per day
);

comment on table public.body_logs is
  'Daily body-weight check-ins. BMI is auto-calculated from the user''s stored height.';

create index idx_body_logs_user_date
  on public.body_logs(user_id, log_date desc);

create trigger trg_body_logs_bmi
  before insert or update on public.body_logs
  for each row execute procedure public.calc_bmi();

alter table public.body_logs enable row level security;

create policy "body_logs_all_own"
  on public.body_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── water_logs ────────────────────────────────────────────────
create table if not exists public.water_logs (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  log_date   date        not null,
  cups       integer     not null default 0 check (cups >= 0),
  goal_cups  integer     not null default 8 check (goal_cups > 0),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

comment on table public.water_logs is
  'Daily water intake tracking — one row per user per day.';

create trigger trg_water_logs_updated_at
  before update on public.water_logs
  for each row execute procedure public.set_updated_at();

alter table public.water_logs enable row level security;

create policy "water_logs_all_own"
  on public.water_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
