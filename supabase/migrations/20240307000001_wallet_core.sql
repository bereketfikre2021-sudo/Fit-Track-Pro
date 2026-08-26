-- ============================================================
--  Migration: Wallet Core — Tables, Enums, and RLS
--  Phase 14.5 — FitTrack Pro
--
--  CREDIT/DEBIT MODEL:
--    All ledger amounts use a SIGNED model:
--      positive amount = CREDIT  (money added to wallet)
--      negative amount = DEBIT   (money taken from wallet)
--    balance_before and balance_after are always non-negative.
--    This avoids direction confusion when auditing.
--
--  Adds:
--    1. wallet_transaction_type enum
--    2. wallet_transaction_status enum
--    3. wallets table (one per user)
--    4. wallet_ledger table (immutable, append-only)
--    5. Indexes and RLS policies
--    6. v_wallet_summary view
-- ============================================================

-- ── 1. wallet_transaction_type ────────────────────────────────────────────────
create type public.wallet_transaction_type as enum (
  'TOP_UP',                -- User deposited money (after admin approval)
  'SUBSCRIPTION_PURCHASE', -- User bought a subscription using wallet
  'SUBSCRIPTION_RENEWAL',  -- Auto-renewal deducted from wallet
  'REFUND',                -- Manual refund credit
  'ADJUSTMENT',            -- Admin correction credit/debit
  'REVERSAL'               -- Reversal of a prior transaction (correction trail)
);

comment on type public.wallet_transaction_type is
  'Types of wallet ledger entries. All balance changes must have a corresponding ledger row.';

-- ── 2. wallet_transaction_status ──────────────────────────────────────────────
create type public.wallet_transaction_status as enum (
  'COMPLETED', -- finalized, balance updated
  'PENDING',   -- reserved for future async flows
  'FAILED',    -- attempted but did not complete
  'REVERSED'   -- this transaction was later reversed
);

-- ── 3. wallets ────────────────────────────────────────────────────────────────
--
-- One wallet per user. Created on-demand (upsert on first access).
-- Balance is a denormalized cache — always derivable from the ledger.
-- NEVER update balance directly; use the atomic RPCs in migration 4.

create table if not exists public.wallets (
  id          uuid          primary key default gen_random_uuid(),
  user_id     uuid          not null unique references auth.users(id) on delete cascade,
  balance     numeric(14,2) not null default 0.00 check (balance >= 0),
  currency    char(3)       not null default 'ETB',
  -- status allows admin to freeze wallets if needed
  status      text          not null default 'active'
                check (status in ('active', 'frozen', 'closed')),
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

comment on table public.wallets is
  'One prepaid wallet per user. Balance is always >= 0.
   Never UPDATE balance directly — use wallet RPCs only.';

comment on column public.wallets.balance is
  'Denormalized running balance in ETB. Authoritative source is wallet_ledger sum.';

create index idx_wallets_user_id on public.wallets(user_id);

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at
  before update on public.wallets
  for each row execute procedure public.set_updated_at();

-- RLS: users read only their own wallet; balance can only be changed by RPCs (security definer)
alter table public.wallets enable row level security;

-- Users: read own wallet only
create policy "Users read own wallet"
  on public.wallets for select
  using (auth.uid() = user_id);

-- Users: CANNOT insert or update wallet directly (balance changes via RPC only)
-- Insert is handled by ensure_wallet() RPC (security definer)
-- Update is handled by atomic RPCs (security definer)

-- Admins: can read all wallets
create policy "Admins read all wallets"
  on public.wallets for select
  using (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ));

-- Admins: can update wallet STATUS (freeze/unfreeze) but NOT balance
-- Balance updates are still done only via RPC
create policy "Admins update wallet status"
  on public.wallets for update
  using (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ))
  with check (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ));

-- ── 4. wallet_ledger ──────────────────────────────────────────────────────────
--
-- IMMUTABLE append-only audit trail.
-- Every balance change creates exactly one row here.
-- Rows are NEVER deleted or updated after INSERT.
-- Corrections use REVERSAL or ADJUSTMENT transaction types.

create table if not exists public.wallet_ledger (
  id                     uuid          primary key default gen_random_uuid(),
  wallet_id              uuid          not null references public.wallets(id) on delete restrict,
  user_id                uuid          not null references auth.users(id) on delete restrict,

  -- Transaction classification
  type                   public.wallet_transaction_type   not null,
  status                 public.wallet_transaction_status not null default 'COMPLETED',

  -- Amount: positive = credit, negative = debit (signed model)
  amount                 numeric(14,2) not null check (amount != 0),
  currency               char(3)       not null default 'ETB',

  -- Balance snapshots at time of transaction (for auditability)
  balance_before         numeric(14,2) not null check (balance_before >= 0),
  balance_after          numeric(14,2) not null check (balance_after >= 0),

  -- External reference (e.g. bank ref, submission ID)
  reference              text,

  -- Optional links to related records
  related_payment_id     uuid          references public.payments(id)            on delete set null,
  related_submission_id  uuid          references public.payment_submissions(id)  on delete set null,
  related_subscription_id uuid         references public.user_subscriptions(id)  on delete set null,
  reversed_by            uuid          references public.wallet_ledger(id)       on delete set null,
  reverses               uuid          references public.wallet_ledger(id)       on delete set null,

  -- Human-readable description
  description            text,

  -- Idempotency key — prevents double-processing the same operation
  idempotency_key        text          unique,

  -- Who initiated this transaction (user | system | admin:<id>)
  initiated_by           text          not null default 'system',

  created_at             timestamptz   not null default now()
  -- NO updated_at — ledger rows are immutable after creation
);

comment on table public.wallet_ledger is
  'Immutable wallet transaction ledger.
   SIGNED AMOUNT MODEL: positive = credit, negative = debit.
   Never update or delete rows. Use REVERSAL/ADJUSTMENT to correct.';

comment on column public.wallet_ledger.amount is
  'Signed amount: positive = credit (money in), negative = debit (money out).';
comment on column public.wallet_ledger.idempotency_key is
  'Prevents double-processing. Set to a deterministic value per operation (e.g. "renewal:{sub_id}:{date}").';

-- Indexes
create index idx_wallet_ledger_wallet_id  on public.wallet_ledger(wallet_id);
create index idx_wallet_ledger_user_id    on public.wallet_ledger(user_id);
create index idx_wallet_ledger_type       on public.wallet_ledger(type);
create index idx_wallet_ledger_created_at on public.wallet_ledger(created_at desc);
create index idx_wallet_ledger_idem_key   on public.wallet_ledger(idempotency_key) where idempotency_key is not null;
create index idx_wallet_ledger_submission on public.wallet_ledger(related_submission_id) where related_submission_id is not null;
create index idx_wallet_ledger_sub        on public.wallet_ledger(related_subscription_id) where related_subscription_id is not null;

-- RLS: users read own ledger; INSERT only via security-definer RPCs
alter table public.wallet_ledger enable row level security;

-- Users: read own ledger rows only
create policy "Users read own wallet ledger"
  on public.wallet_ledger for select
  using (auth.uid() = user_id);

-- Users/admins: NO direct insert/update/delete
-- All writes go through security-definer RPCs

-- Admins: read all ledger rows
create policy "Admins read all wallet ledger"
  on public.wallet_ledger for select
  using (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ));

-- Service role: can insert (used by RPCs with security definer)
-- The security-definer RPCs bypass RLS, so this policy is for reference only.

-- ── 5. Prevent ledger row modification (immutability trigger) ─────────────────
create or replace function public.prevent_wallet_ledger_modification()
returns trigger language plpgsql as $$
begin
  raise exception 'wallet_ledger rows are immutable — use REVERSAL or ADJUSTMENT transactions';
end;
$$;

drop trigger if exists trg_wallet_ledger_immutable_update on public.wallet_ledger;
create trigger trg_wallet_ledger_immutable_update
  before update on public.wallet_ledger
  for each row execute procedure public.prevent_wallet_ledger_modification();

drop trigger if exists trg_wallet_ledger_immutable_delete on public.wallet_ledger;
create trigger trg_wallet_ledger_immutable_delete
  before delete on public.wallet_ledger
  for each row execute procedure public.prevent_wallet_ledger_modification();

-- ── 6. ensure_wallet() — idempotent wallet creation ──────────────────────────
--
-- Called whenever we need a wallet but it might not exist yet.
-- Returns the wallet row.
create or replace function public.ensure_wallet(p_user_id uuid)
returns public.wallets
language plpgsql
security definer
as $$
declare
  v_wallet public.wallets;
begin
  insert into public.wallets (user_id, balance, currency, status)
  values (p_user_id, 0.00, 'ETB', 'active')
  on conflict (user_id) do nothing;

  select * into v_wallet from public.wallets where user_id = p_user_id;
  return v_wallet;
end;
$$;

comment on function public.ensure_wallet(uuid) is
  'Idempotently creates a wallet for the user if one does not already exist.';

grant execute on function public.ensure_wallet(uuid) to authenticated, service_role;

-- ── 7. v_wallet_summary view ─────────────────────────────────────────────────
create or replace view public.v_wallet_summary as
select
  w.id              as wallet_id,
  w.user_id,
  w.balance,
  w.currency,
  w.status          as wallet_status,
  w.created_at,
  w.updated_at,
  -- ledger stats
  count(wl.id)                                          as total_transactions,
  coalesce(sum(case when wl.amount > 0 then wl.amount else 0 end), 0) as total_credited,
  coalesce(sum(case when wl.amount < 0 then abs(wl.amount) else 0 end), 0) as total_debited,
  -- last transaction
  max(wl.created_at)                                    as last_transaction_at
from public.wallets w
left join public.wallet_ledger wl on wl.wallet_id = w.id and wl.status = 'COMPLETED'
group by w.id, w.user_id, w.balance, w.currency, w.status, w.created_at, w.updated_at;

comment on view public.v_wallet_summary is
  'Wallet overview with aggregated ledger stats per user.';

-- ── 8. Grants ──────────────────────────────────────────────────────────────────
grant select on public.wallets       to authenticated;
grant select on public.wallet_ledger to authenticated;
grant select on public.v_wallet_summary to authenticated;

notify pgrst, 'reload schema';
