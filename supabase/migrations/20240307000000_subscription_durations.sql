-- ============================================================
--  Migration: Subscription Durations
--  Phase 14.5 — FitTrack Pro
--
--  Adds:
--    1. subscription_duration enum   — 1m | 3m | 6m | 12m
--    2. subscription_purchase_options — plan × duration matrix
--       (price, discount, active, display_order per combo)
--    3. duration_months column on user_subscriptions
--    4. Seed purchase options from existing plan prices
-- ============================================================

-- ── 1. Duration enum ──────────────────────────────────────────────────────────
create type public.subscription_duration as enum (
  '1_month',
  '3_months',
  '6_months',
  '12_months'
);

comment on type public.subscription_duration is
  'Supported billing durations for subscription purchase options.';

-- ── 2. subscription_purchase_options ─────────────────────────────────────────
--
-- This table is the ONLY place where prices live.
-- Frontend must NEVER hardcode prices.
-- Each row = one purchasable option (plan × duration combination).

create table if not exists public.subscription_purchase_options (
  id               uuid          primary key default gen_random_uuid(),

  -- Which base plan this option belongs to
  plan_id          uuid          not null references public.subscription_plans(id) on delete cascade,

  -- Billing duration
  duration         public.subscription_duration not null,
  duration_months  integer       not null check (duration_months in (1, 3, 6, 12)),

  -- Pricing (ETB, single numeric field — no USD confusion)
  price_etb        numeric(12,2) not null check (price_etb >= 0),
  currency         char(3)       not null default 'ETB',

  -- Optional percentage discount displayed to the user (purely informational)
  -- e.g. 10 means "10% off vs monthly rate". Set NULL to hide the badge.
  discount_pct     integer       check (discount_pct between 0 and 99),

  -- Admin can enable/disable specific options without deleting them
  is_active        boolean       not null default true,

  -- Controls the order shown to users
  display_order    integer       not null default 0,

  -- Audit
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now(),

  -- One option per plan × duration (enforced uniqueness)
  unique (plan_id, duration)
);

comment on table public.subscription_purchase_options is
  'Purchasable subscription options: each row is one plan × billing duration combo.
   Prices are in ETB. Frontend must read from this table — never hardcode prices.';

create index idx_spo_plan_id    on public.subscription_purchase_options(plan_id);
create index idx_spo_active     on public.subscription_purchase_options(is_active, display_order);

drop trigger if exists trg_spo_updated_at on public.subscription_purchase_options;
create trigger trg_spo_updated_at
  before update on public.subscription_purchase_options
  for each row execute procedure public.set_updated_at();

-- RLS: anyone reads, only admins write
alter table public.subscription_purchase_options enable row level security;

create policy "Anyone reads active purchase options"
  on public.subscription_purchase_options for select
  using (true);

create policy "Admins manage purchase options"
  on public.subscription_purchase_options for all
  using (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ))
  with check (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ));

-- ── 3. Extend user_subscriptions: track duration + purchase option ────────────
alter table public.user_subscriptions
  add column if not exists duration_months      integer    default 1 check (duration_months in (1, 3, 6, 12)),
  add column if not exists purchase_option_id   uuid       references public.subscription_purchase_options(id) on delete set null,
  add column if not exists price_paid_etb       numeric(12,2),    -- snapshot of price at time of purchase
  add column if not exists auto_renew           boolean    not null default false;

comment on column public.user_subscriptions.duration_months is
  'How many months this subscription period covers.';
comment on column public.user_subscriptions.auto_renew is
  'Whether to auto-renew from wallet when subscription expires.';
comment on column public.user_subscriptions.price_paid_etb is
  'ETB amount actually charged at time of purchase (snapshot, not live price).';

-- ── 4. Seed purchase options from existing plan prices ─────────────────────────
--
-- Monthly prices already exist in subscription_plans.price_monthly_usd.
-- We re-use those as ETB values (the column name is misleading; in this
-- deployment the amounts are already in ETB).
-- Discount tiers: 1m = 0%, 3m = 5%, 6m = 10%, 12m = 15%

insert into public.subscription_purchase_options
  (plan_id, duration, duration_months, price_etb, currency, discount_pct, is_active, display_order)
select
  sp.id,
  d.duration,
  d.months,
  -- price = monthly * months, then multiply by (1 - discount/100)
  round( sp.price_monthly_usd * d.months * (1 - d.discount::numeric / 100), 2 ),
  'ETB',
  d.discount,
  true,
  d.disp_order
from public.subscription_plans sp
cross join (
  values
    ('1_month'::public.subscription_duration,  1,  0,  1),
    ('3_months'::public.subscription_duration, 3,  5,  2),
    ('6_months'::public.subscription_duration, 6, 10,  3),
    ('12_months'::public.subscription_duration,12, 15,  4)
) as d(duration, months, discount, disp_order)
where sp.tier != 'free'   -- free plan has no purchase options
on conflict (plan_id, duration) do nothing;

-- ── 5. Helper view: enriched purchase options ─────────────────────────────────
create or replace view public.v_subscription_purchase_options as
select
  spo.id,
  spo.plan_id,
  sp.name            as plan_name,
  sp.tier            as plan_tier,
  sp.features        as plan_features,
  sp.max_ai_calls_day,
  sp.max_devices,
  spo.duration,
  spo.duration_months,
  spo.price_etb,
  spo.currency,
  spo.discount_pct,
  -- effective monthly rate (for "X/month" display)
  round(spo.price_etb / spo.duration_months, 2) as effective_monthly_etb,
  spo.is_active,
  spo.display_order,
  spo.created_at,
  spo.updated_at
from public.subscription_purchase_options spo
join public.subscription_plans sp on sp.id = spo.plan_id
where spo.is_active = true
  and sp.is_active  = true
order by sp.price_monthly_usd, spo.display_order;

comment on view public.v_subscription_purchase_options is
  'Active purchase options with plan details. Frontend reads this view for the plan selector.';

grant select on public.subscription_purchase_options to anon, authenticated;
grant select on public.v_subscription_purchase_options to anon, authenticated;

notify pgrst, 'reload schema';
