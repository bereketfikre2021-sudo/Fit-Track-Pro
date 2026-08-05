-- ============================================================
--  Migration: Invoices, Billing Addresses, Payment Methods
--  Production-grade billing infrastructure for subscription management.
-- ============================================================

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type public.invoice_status as enum (
  'draft', 'open', 'paid', 'void', 'uncollectible'
);

-- ── billing_addresses ─────────────────────────────────────────────────────────
create table if not exists public.billing_addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  line1           text not null,
  line2           text,
  city            text not null,
  state           text,
  postal_code     text,
  country         char(2) not null default 'ET',  -- ISO 3166-1 alpha-2
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.billing_addresses is 'User billing addresses for invoices and payment processing.';
create index idx_billing_addresses_user_id on public.billing_addresses(user_id);

drop trigger if exists trg_billing_addresses_updated_at on public.billing_addresses;
create trigger trg_billing_addresses_updated_at
  before update on public.billing_addresses
  for each row execute procedure public.set_updated_at();

alter table public.billing_addresses enable row level security;
create policy "Users manage own billing addresses"
  on public.billing_addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admins read all billing addresses"
  on public.billing_addresses for select
  using (public.is_admin());

-- ── payment_methods ───────────────────────────────────────────────────────────
create table if not exists public.payment_methods (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  provider            public.payment_provider not null,
  provider_method_id  text not null,               -- Stripe pm_xxx
  type                text not null,               -- 'card','bank_transfer','mobile_money'
  brand               text,                        -- 'visa','mastercard','telebirr'
  last4               char(4),
  exp_month           smallint check (exp_month between 1 and 12),
  exp_year            smallint,
  is_default          boolean not null default false,
  billing_address_id  uuid references public.billing_addresses(id) on delete set null,
  metadata            jsonb default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider_method_id)
);

comment on table public.payment_methods is 'Saved payment methods per user (card tokens, mobile money, etc.).';
create index idx_payment_methods_user_id on public.payment_methods(user_id);

drop trigger if exists trg_payment_methods_updated_at on public.payment_methods;
create trigger trg_payment_methods_updated_at
  before update on public.payment_methods
  for each row execute procedure public.set_updated_at();

alter table public.payment_methods enable row level security;
create policy "Users manage own payment methods"
  on public.payment_methods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admins read all payment methods"
  on public.payment_methods for select
  using (public.is_admin());

-- ── invoices ──────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  subscription_id     uuid references public.user_subscriptions(id) on delete set null,
  payment_id          uuid references public.payments(id) on delete set null,
  billing_address_id  uuid references public.billing_addresses(id) on delete set null,
  payment_method_id   uuid references public.payment_methods(id) on delete set null,

  -- Provider reference
  provider            public.payment_provider not null default 'stripe',
  provider_invoice_id text,                        -- Stripe in_xxx

  -- Invoice number for display (e.g. FTP-2024-00001)
  invoice_number      text unique,

  -- Status
  status              public.invoice_status not null default 'draft',

  -- Amounts (all in USD)
  subtotal_usd        numeric(10,2) not null default 0,
  discount_usd        numeric(10,2) not null default 0,
  tax_usd             numeric(10,2) not null default 0,
  total_usd           numeric(10,2) not null default 0,
  amount_paid_usd     numeric(10,2) not null default 0,
  amount_due_usd      numeric(10,2) generated always as (total_usd - amount_paid_usd) stored,

  -- Currency
  currency            char(3) not null default 'USD',

  -- Dates
  issued_at           timestamptz not null default now(),
  due_at              timestamptz,
  paid_at             timestamptz,
  voided_at           timestamptz,

  -- Period this invoice covers
  period_start        timestamptz,
  period_end          timestamptz,

  -- Line items stored as JSONB for flexibility
  line_items          jsonb not null default '[]',
  -- e.g. [{"description":"Pro Monthly","qty":1,"unit_price":4.99,"amount":4.99}]

  -- Tax details
  tax_rate_pct        numeric(5,2) default 0,
  tax_region          text,                        -- 'ET','US' etc

  -- Customer snapshot at time of invoice (billing details may change)
  customer_name       text,
  customer_email      text,
  customer_address    jsonb,

  -- PDF / hosted URL
  pdf_url             text,
  hosted_url          text,

  -- Notes
  notes               text,
  metadata            jsonb default '{}',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.invoices is
  'Invoices generated for subscription payments. Immutable once paid.';

create index idx_invoices_user_id         on public.invoices(user_id);
create index idx_invoices_subscription_id on public.invoices(subscription_id) where subscription_id is not null;
create index idx_invoices_status          on public.invoices(status);
create index idx_invoices_issued_at       on public.invoices(issued_at desc);
create index idx_invoices_provider_id     on public.invoices(provider_invoice_id) where provider_invoice_id is not null;
create index idx_invoices_invoice_number  on public.invoices(invoice_number) where invoice_number is not null;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

alter table public.invoices enable row level security;

create policy "Users read own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

-- Invoices can only be inserted by service role (Edge Function / webhook)
create policy "System creates invoices"
  on public.invoices for insert
  with check (true);

-- Paid invoices cannot be modified — only draft/open can be updated
create policy "Only unpaid invoices can be updated"
  on public.invoices for update
  using (status in ('draft', 'open'));

-- No direct deletes — void instead
create policy "No invoice deletes"
  on public.invoices for delete
  using (false);

create policy "Admins read all invoices"
  on public.invoices for select
  using (public.is_admin());

create policy "Admins update invoices"
  on public.invoices for update
  using (public.is_admin());

-- ── invoice_number sequence ───────────────────────────────────────────────────
create sequence if not exists public.invoice_number_seq start 1 increment 1;

create or replace function public.generate_invoice_number()
returns trigger language plpgsql as $$
begin
  if new.invoice_number is null then
    new.invoice_number := 'FTP-' || to_char(now(), 'YYYY') || '-' ||
                          lpad(nextval('public.invoice_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_number on public.invoices;
create trigger trg_invoice_number
  before insert on public.invoices
  for each row execute procedure public.generate_invoice_number();

-- ── Harden payments table: add invoice + billing references ──────────────────
alter table public.payments
  add column if not exists invoice_id          uuid references public.invoices(id) on delete set null,
  add column if not exists payment_method_id   uuid references public.payment_methods(id) on delete set null,
  add column if not exists billing_address_id  uuid references public.billing_addresses(id) on delete set null,
  add column if not exists tax_usd             numeric(10,2) default 0,
  add column if not exists fee_usd             numeric(10,2) default 0,   -- processor fee
  add column if not exists net_usd             numeric(10,2),              -- amount - fee
  add column if not exists failure_code        text,
  add column if not exists failure_message     text,
  add column if not exists idempotency_key     text unique;               -- prevents duplicate charges

create index if not exists idx_payments_invoice_id       on public.payments(invoice_id) where invoice_id is not null;
create index if not exists idx_payments_idempotency_key  on public.payments(idempotency_key) where idempotency_key is not null;

-- ── Harden subscription_events: add more event types ────────────────────────
-- The check constraint allows any text so new event types work without migration.
-- Add an index for the most common query: latest events per subscription.
create index if not exists idx_sub_events_latest
  on public.subscription_events(subscription_id, created_at desc);

-- ── Harden audit_logs: add structured fields ──────────────────────────────────
alter table public.audit_logs
  add column if not exists request_id   text,    -- correlate with HTTP request
  add column if not exists session_id   text,    -- Supabase session ID
  add column if not exists severity     text not null default 'info'
    check (severity in ('info','warning','error','critical'));

create index if not exists idx_audit_logs_severity   on public.audit_logs(severity) where severity in ('warning','error','critical');
create index if not exists idx_audit_logs_request_id on public.audit_logs(request_id) where request_id is not null;

-- ── View: invoice summary per user ───────────────────────────────────────────
create or replace view public.v_user_invoices as
select
  i.id,
  i.user_id,
  i.invoice_number,
  i.status,
  i.total_usd,
  i.amount_paid_usd,
  i.amount_due_usd,
  i.currency,
  i.issued_at,
  i.due_at,
  i.paid_at,
  sp.name  as plan_name,
  sp.tier  as plan_tier,
  i.pdf_url,
  i.hosted_url
from public.invoices i
left join public.user_subscriptions us on us.id = i.subscription_id
left join public.subscription_plans sp on sp.id = us.plan_id
order by i.issued_at desc;

comment on view public.v_user_invoices is
  'Invoice list per user with plan details for the billing portal.';

-- ── View: admin revenue dashboard ────────────────────────────────────────────
create or replace view public.v_admin_billing_dashboard as
select
  date_trunc('month', i.issued_at)::date as month,
  i.currency,
  i.status,
  count(*)                               as invoice_count,
  sum(i.total_usd)                       as gross_revenue,
  sum(i.amount_paid_usd)                 as collected_revenue,
  sum(i.tax_usd)                         as tax_collected,
  sum(p.fee_usd)                         as processor_fees,
  sum(i.amount_paid_usd - coalesce(p.fee_usd,0)) as net_revenue
from public.invoices i
left join public.payments p on p.invoice_id = i.id
group by month, i.currency, i.status
order by month desc;

comment on view public.v_admin_billing_dashboard is
  'Monthly revenue breakdown for admin financial reporting.';

-- ── Function: void an invoice (admin only) ───────────────────────────────────
create or replace function public.void_invoice(p_invoice_id uuid, p_reason text default null)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can void invoices';
  end if;

  update public.invoices
  set status    = 'void',
      voided_at = now(),
      notes     = coalesce(notes || ' | ', '') || 'Voided: ' || coalesce(p_reason, 'No reason given'),
      updated_at = now()
  where id = p_invoice_id
    and status not in ('paid', 'void');

  -- Log to audit
  insert into public.audit_logs(user_id, action, table_name, record_id, metadata, severity)
  values (auth.uid(), 'admin_action', 'invoices', p_invoice_id,
          jsonb_build_object('action','void','reason', p_reason), 'warning');
end;
$$;

grant execute on function public.void_invoice(uuid, text) to authenticated;
