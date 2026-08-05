-- ============================================================
--  Migration: Nutrition — Foods, Ethiopian Foods, Meal Plans
-- ============================================================

create type public.food_source as enum ('usda','openfoodfacts','ethiopian','custom','ai_generated');

-- ── foods (global food database) ─────────────────────────────────────────────
create table if not exists public.foods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,   -- null = global
  name            text not null,
  name_am         text,                                                 -- Amharic name
  brand           text,
  source          public.food_source not null default 'custom',
  external_id     text,                                                 -- USDA or OFF ID
  serving_size    numeric(8,2),
  serving_unit    text default 'g',
  calories        numeric(8,2),
  protein_g       numeric(7,2),
  carbs_g         numeric(7,2),
  fat_g           numeric(7,2),
  fiber_g         numeric(7,2),
  sugar_g         numeric(7,2),
  sodium_mg       numeric(8,2),
  potassium_mg    numeric(8,2),
  vitamin_c_mg    numeric(7,2),
  iron_mg         numeric(7,2),
  calcium_mg      numeric(8,2),
  is_verified     boolean not null default false,
  is_featured     boolean not null default false,
  barcode         text,
  image_url       text,
  tags            text[],
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.foods is 'Global and user-created food items with full nutrition data.';
create index idx_foods_user_id    on public.foods(user_id);
create index idx_foods_source     on public.foods(source);
create index idx_foods_name_lower on public.foods(lower(name));
create index idx_foods_barcode    on public.foods(barcode) where barcode is not null;
create index idx_foods_deleted_at on public.foods(deleted_at) where deleted_at is null;

drop trigger if exists trg_foods_updated_at on public.foods;
create trigger trg_foods_updated_at before update on public.foods for each row execute procedure public.set_updated_at();

alter table public.foods enable row level security;
create policy "Global foods readable by all" on public.foods for select using (user_id is null or user_id = auth.uid());
create policy "Users manage own foods"       on public.foods for insert with check (auth.uid() = user_id);
create policy "Users update own foods"       on public.foods for update using (auth.uid() = user_id);
create policy "Users delete own foods"       on public.foods for delete using (auth.uid() = user_id);

-- ── ethiopian_foods ───────────────────────────────────────────────────────────
create table if not exists public.ethiopian_foods (
  id              uuid primary key default gen_random_uuid(),
  food_id         uuid references public.foods(id) on delete cascade,
  name_en         text not null,
  name_am         text not null,
  category        text not null,  -- 'injera_based','stew','salad','beverage','snack','grain'
  region          text,           -- 'national','addis_ababa','tigray','oromia','amhara' etc
  description     text,
  is_vegan        boolean not null default false,
  is_vegetarian   boolean not null default false,
  is_fasting_safe boolean not null default false,  -- Ethiopian Orthodox fasting
  common_ingredients text[],
  image_url       text,
  created_at      timestamptz not null default now()
);

comment on table public.ethiopian_foods is 'Ethiopian-specific food metadata linked to the foods table.';
create index idx_eth_foods_food_id  on public.ethiopian_foods(food_id);
create index idx_eth_foods_category on public.ethiopian_foods(category);
create index idx_eth_foods_fasting  on public.ethiopian_foods(is_fasting_safe) where is_fasting_safe = true;

alter table public.ethiopian_foods enable row level security;
create policy "Anyone reads Ethiopian foods" on public.ethiopian_foods for select using (true);
create policy "Admins manage Ethiopian foods" on public.ethiopian_foods for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── meal_log (daily food diary — extends existing meal_plans) ─────────────────
create table if not exists public.meal_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  log_date        date not null default current_date,
  meal_slot       text not null check (meal_slot in ('breakfast','morningSnack','lunch','afternoonSnack','dinner','beforeBed')),
  food_id         uuid references public.foods(id) on delete set null,
  food_name       text not null,
  quantity        numeric(8,2) not null default 1,
  serving_unit    text not null default 'g',
  calories        numeric(8,2),
  protein_g       numeric(7,2),
  carbs_g         numeric(7,2),
  fat_g           numeric(7,2),
  notes           text,
  logged_at       timestamptz not null default now()
);

comment on table public.meal_logs is 'Daily food diary entries with full macro data.';
create index idx_meal_logs_user_date on public.meal_logs(user_id, log_date desc);
create index idx_meal_logs_food_id   on public.meal_logs(food_id) where food_id is not null;

alter table public.meal_logs enable row level security;
create policy "Users manage own meal logs" on public.meal_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── View: daily nutrition totals ──────────────────────────────────────────────
create or replace view public.v_daily_nutrition as
select
  user_id,
  log_date,
  meal_slot,
  round(sum(calories)::numeric,  1) as total_calories,
  round(sum(protein_g)::numeric, 1) as total_protein_g,
  round(sum(carbs_g)::numeric,   1) as total_carbs_g,
  round(sum(fat_g)::numeric,     1) as total_fat_g,
  count(*)                           as food_items
from public.meal_logs
group by user_id, log_date, meal_slot;

-- ── shopping_list_items (replaces JSONB approach) ────────────────────────────
create table if not exists public.shopping_list_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  food_id         uuid references public.foods(id) on delete set null,
  name            text not null,
  category        text not null default 'Other',
  quantity        numeric(8,2),
  unit            text,
  is_checked      boolean not null default false,
  notes           text,
  week_of         date,     -- which week this item belongs to
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.shopping_list_items is 'Persistent shopping list items with category grouping.';
create index idx_shopping_list_user on public.shopping_list_items(user_id);
create index idx_shopping_list_week on public.shopping_list_items(user_id, week_of);

drop trigger if exists trg_shopping_updated_at on public.shopping_list_items;
create trigger trg_shopping_updated_at before update on public.shopping_list_items for each row execute procedure public.set_updated_at();

alter table public.shopping_list_items enable row level security;
create policy "Users manage own shopping list" on public.shopping_list_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
