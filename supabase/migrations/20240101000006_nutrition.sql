-- ============================================================
--  Migration 007 — meal_plans + nutrition_logs
-- ============================================================

-- ── meal_plans (weekly recurring template) ───────────────────
create table if not exists public.meal_plans (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references public.users(id) on delete cascade,
  day_of_week  text         not null
                 check (day_of_week in
                   ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  meal_slot    text         not null
                 check (meal_slot in
                   ('breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed')),
  food_name    text         not null,
  calories     numeric(7,1) check (calories >= 0),
  protein_g    numeric(6,1) check (protein_g >= 0),
  carbs_g      numeric(6,1) check (carbs_g >= 0),
  fat_g        numeric(6,1) check (fat_g >= 0),
  serving_size text,
  notes        text,
  sort_order   integer      not null default 0,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now()
);

comment on table public.meal_plans is
  'Weekly repeating meal plan — one row per food item per slot per day.';

create index idx_meal_plans_user_day on public.meal_plans(user_id, day_of_week);

create trigger trg_meal_plans_updated_at
  before update on public.meal_plans
  for each row execute procedure public.set_updated_at();

alter table public.meal_plans enable row level security;

create policy "meal_plans_all_own"
  on public.meal_plans for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── nutrition_logs (daily food diary) ────────────────────────
create table if not exists public.nutrition_logs (
  id           uuid         primary key default gen_random_uuid(),
  user_id      uuid         not null references public.users(id) on delete cascade,
  log_date     date         not null,
  meal_slot    text         not null
                 check (meal_slot in
                   ('breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed')),
  food_name    text         not null,
  calories     numeric(7,1) check (calories >= 0),
  protein_g    numeric(6,1) check (protein_g >= 0),
  carbs_g      numeric(6,1) check (carbs_g >= 0),
  fat_g        numeric(6,1) check (fat_g >= 0),
  serving_size text,
  notes        text,
  logged_at    timestamptz  not null default now()
);

comment on table public.nutrition_logs is
  'Actual meals consumed on a specific date (daily food diary).';

create index idx_nutrition_logs_user_date
  on public.nutrition_logs(user_id, log_date desc);

alter table public.nutrition_logs enable row level security;

create policy "nutrition_logs_all_own"
  on public.nutrition_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
