-- ============================================================
--  Migration: Roles, Subscription Plans, Audit Infrastructure
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type public.user_role         as enum ('user', 'moderator', 'admin', 'super_admin');
create type public.subscription_tier as enum ('free', 'pro', 'elite', 'team');
create type public.subscription_status as enum ('active', 'cancelled', 'expired', 'trialing', 'past_due', 'paused');
create type public.payment_status    as enum ('pending', 'succeeded', 'failed', 'refunded', 'disputed');
create type public.payment_provider  as enum ('stripe', 'paypal', 'apple', 'google', 'manual');
create type public.audit_action      as enum ('insert', 'update', 'delete', 'login', 'logout', 'export', 'admin_action');

-- ── user_roles ────────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.user_role not null default 'user',
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  notes      text,
  unique (user_id, role)
);

comment on table public.user_roles is 'Assigns roles to users. Multiple roles per user allowed.';
create index idx_user_roles_user_id on public.user_roles(user_id);

alter table public.user_roles enable row level security;
create policy "Admins can manage roles"     on public.user_roles for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
create policy "Users can read own role"     on public.user_roles for select using (auth.uid() = user_id);

-- ── subscription_plans ────────────────────────────────────────────────────────
create table if not exists public.subscription_plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  tier              public.subscription_tier not null unique,
  price_monthly_usd numeric(10,2) not null default 0,
  price_yearly_usd  numeric(10,2) not null default 0,
  features          jsonb not null default '{}',
  max_ai_calls_day  integer not null default 10,
  max_devices       integer not null default 1,
  is_active         boolean not null default true,
  stripe_price_id_monthly text,
  stripe_price_id_yearly  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.subscription_plans is 'Available subscription tiers and their limits.';
insert into public.subscription_plans (name, tier, price_monthly_usd, price_yearly_usd, max_ai_calls_day, max_devices, features) values
  ('Free',  'free',  0,    0,    5,  1,  '{"ads":true,"ai":false,"export":false}'),
  ('Pro',   'pro',   4.99, 49.99, 50, 3,  '{"ads":false,"ai":true,"export":true}'),
  ('Elite', 'elite', 9.99, 99.99, 200,5,  '{"ads":false,"ai":true,"export":true,"priority_support":true}'),
  ('Team',  'team',  29.99,299.99,1000,20, '{"ads":false,"ai":true,"export":true,"team":true}')
on conflict (tier) do nothing;

alter table public.subscription_plans enable row level security;
create policy "Anyone can read plans" on public.subscription_plans for select using (true);
create policy "Only admins can modify plans" on public.subscription_plans for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── user_subscriptions ────────────────────────────────────────────────────────
create table if not exists public.user_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  plan_id             uuid not null references public.subscription_plans(id),
  status              public.subscription_status not null default 'active',
  provider            public.payment_provider not null default 'stripe',
  provider_sub_id     text,                          -- Stripe subscription ID
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_start          timestamptz,
  trial_end            timestamptz,
  cancelled_at         timestamptz,
  paused_at            timestamptz,
  metadata             jsonb default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.user_subscriptions is 'Active and historical user subscriptions.';
create index idx_user_subs_user_id on public.user_subscriptions(user_id);
create index idx_user_subs_status  on public.user_subscriptions(status);
create index idx_user_subs_provider_id on public.user_subscriptions(provider_sub_id) where provider_sub_id is not null;

alter table public.user_subscriptions enable row level security;
create policy "Users read own subscriptions"   on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "Admins manage all subscriptions" on public.user_subscriptions for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── payments ──────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  subscription_id     uuid references public.user_subscriptions(id) on delete set null,
  provider            public.payment_provider not null,
  provider_payment_id text,
  amount_usd          numeric(10,2) not null,
  currency            char(3) not null default 'USD',
  status              public.payment_status not null default 'pending',
  description         text,
  receipt_url         text,
  refunded_amount     numeric(10,2) default 0,
  refunded_at         timestamptz,
  metadata            jsonb default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.payments is 'Payment records for subscriptions.';
create index idx_payments_user_id on public.payments(user_id);
create index idx_payments_status  on public.payments(status);
create index idx_payments_provider_id on public.payments(provider_payment_id) where provider_payment_id is not null;

alter table public.payments enable row level security;
create policy "Users read own payments"   on public.payments for select using (auth.uid() = user_id);
create policy "Admins manage all payments" on public.payments for all using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── subscription_events ───────────────────────────────────────────────────────
create table if not exists public.subscription_events (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  event_type      text not null,  -- e.g. 'created','upgraded','downgraded','cancelled','renewed'
  old_plan_id     uuid references public.subscription_plans(id),
  new_plan_id     uuid references public.subscription_plans(id),
  triggered_by    text not null default 'user',  -- 'user','admin','webhook','system'
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

comment on table public.subscription_events is 'Immutable log of all subscription lifecycle events.';
create index idx_sub_events_subscription_id on public.subscription_events(subscription_id);
create index idx_sub_events_user_id         on public.subscription_events(user_id);

alter table public.subscription_events enable row level security;
create policy "Users read own sub events" on public.subscription_events for select using (auth.uid() = user_id);
create policy "Admins read all sub events" on public.subscription_events for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
create policy "System inserts sub events"  on public.subscription_events for insert with check (true);

-- ── audit_logs ────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      public.audit_action not null,
  table_name  text,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  inet,
  user_agent  text,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable audit trail for security and compliance.';
create index idx_audit_logs_user_id    on public.audit_logs(user_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index idx_audit_logs_table_name on public.audit_logs(table_name) where table_name is not null;

alter table public.audit_logs enable row level security;
create policy "Admins read audit logs" on public.audit_logs for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));
create policy "System inserts audit logs" on public.audit_logs for insert with check (true);

-- ── Helper: auto-updated updated_at (already exists but safe to re-run) ──────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Attach to new tables
drop trigger if exists trg_sub_plans_updated_at on public.subscription_plans;
create trigger trg_sub_plans_updated_at before update on public.subscription_plans for each row execute procedure public.set_updated_at();

drop trigger if exists trg_user_subs_updated_at on public.user_subscriptions;
create trigger trg_user_subs_updated_at before update on public.user_subscriptions for each row execute procedure public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments for each row execute procedure public.set_updated_at();

-- ── View: active subscriptions with plan details ─────────────────────────────
create or replace view public.v_active_subscriptions as
select
  us.id,
  us.user_id,
  sp.name         as plan_name,
  sp.tier,
  sp.features,
  sp.max_ai_calls_day,
  sp.max_devices,
  us.status,
  us.current_period_start,
  us.current_period_end,
  us.cancel_at_period_end,
  us.trial_end
from public.user_subscriptions us
join public.subscription_plans sp on sp.id = us.plan_id
where us.status in ('active', 'trialing');

comment on view public.v_active_subscriptions is 'Active and trialing subscriptions with plan features.';
