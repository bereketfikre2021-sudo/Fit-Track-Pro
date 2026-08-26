-- ============================================================
--  Migration: Wallet Top-Up Flow
--  Phase 14.5 — FitTrack Pro
--
--  Extends the existing payment_submissions table to support
--  wallet top-up submissions (in addition to subscription purchases).
--
--  A top-up submission is identified by:
--    purpose = 'wallet_topup'  (new column)
--    plan_id = NULL
--
--  Adds:
--    1. submission_purpose enum
--    2. purpose column on payment_submissions
--    3. topup_amount_etb column on payment_submissions
--    4. wallet_id FK on payment_submissions
--    5. wallet_topup_requests view (convenience)
--    6. Index updates
-- ============================================================

-- ── 1. submission_purpose enum ────────────────────────────────────────────────
create type public.submission_purpose as enum (
  'subscription_purchase',  -- existing: buying/renewing a subscription
  'wallet_topup'            -- new: loading money into the wallet
);

-- ── 2. Extend payment_submissions ─────────────────────────────────────────────
--
-- Make plan_id nullable so top-up submissions don't require a plan.
-- This is a safe change; existing rows all have plan_id set.
alter table public.payment_submissions
  alter column plan_id drop not null;

-- Purpose column: defaults to existing behaviour for all old rows
alter table public.payment_submissions
  add column if not exists purpose   public.submission_purpose not null default 'subscription_purchase';

-- For top-up submissions the user declares the amount they want to add.
-- This becomes the amount credited to the wallet on approval.
alter table public.payment_submissions
  add column if not exists topup_amount_etb numeric(12,2)
    check (topup_amount_etb is null or topup_amount_etb > 0);

-- Link to the wallet that should receive the credit (set on submission)
alter table public.payment_submissions
  add column if not exists wallet_id uuid
    references public.wallets(id) on delete set null;

-- ── 3. Constraint: top-up must have topup_amount_etb, sub-purchase must have plan_id ──
alter table public.payment_submissions
  drop constraint if exists chk_submission_purpose_fields;

alter table public.payment_submissions
  add constraint chk_submission_purpose_fields check (
    (purpose = 'wallet_topup'           and topup_amount_etb is not null) or
    (purpose = 'subscription_purchase'  and plan_id is not null)
  );

-- ── 4. Index ──────────────────────────────────────────────────────────────────
create index if not exists idx_payment_submissions_purpose
  on public.payment_submissions(purpose);

create index if not exists idx_payment_submissions_wallet_id
  on public.payment_submissions(wallet_id) where wallet_id is not null;

-- ── 5. Convenience view: pending wallet top-up requests ───────────────────────
create or replace view public.v_wallet_topup_requests as
select
  ps.id                   as submission_id,
  ps.user_id,
  ps.wallet_id,
  ps.topup_amount_etb     as amount_etb,
  ps.currency,
  ps.payment_method_id,
  apm.name                as payment_method_name,
  apm.type                as payment_method_type,
  ps.transaction_ref,
  ps.payment_date,
  ps.proof_path,
  ps.note,
  ps.status,
  ps.submitted_at,
  ps.verified_by,
  ps.verified_at,
  ps.verification_note,
  ps.rejection_reason,
  ps.rejection_reason_custom,
  ps.is_duplicate_suspect,
  ps.created_at,
  ps.updated_at
from public.payment_submissions ps
join public.app_payment_methods apm on apm.id = ps.payment_method_id
where ps.purpose = 'wallet_topup'
order by ps.submitted_at desc;

comment on view public.v_wallet_topup_requests is
  'All wallet top-up payment submissions with payment method details.';

grant select on public.v_wallet_topup_requests to authenticated;

notify pgrst, 'reload schema';
