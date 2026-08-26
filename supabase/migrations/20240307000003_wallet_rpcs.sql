-- ============================================================
--  Migration: Atomic Wallet RPCs
--  Phase 14.5 — FitTrack Pro
--
--  All wallet balance changes MUST go through these RPCs.
--  Every RPC: (a) updates wallet balance atomically, (b) creates
--  an immutable ledger row. Both happen in one transaction.
--
--  SIGNED AMOUNT MODEL:
--    positive amount → credit (balance increases)
--    negative amount → debit  (balance decreases)
--
--  RPCs:
--    1. wallet_credit()                  — internal credit primitive
--    2. wallet_debit()                   — internal debit primitive (no-negative guard)
--    3. approve_wallet_topup()           — admin: approve top-up submission → credit wallet
--    4. reject_wallet_topup()            — admin: reject top-up submission
--    5. purchase_subscription_with_wallet() — user: buy subscription using wallet balance
--    6. wallet_adjustment()              — admin: manual balance adjustment (ADJUSTMENT/REVERSAL)
-- ============================================================

-- ── 1. wallet_credit (internal primitive) ────────────────────────────────────
--
-- Credits an amount to a wallet atomically. Creates ledger entry.
-- Called by other RPCs — NOT exposed directly to clients.

create or replace function public.wallet_credit(
  p_user_id           uuid,
  p_amount            numeric,    -- must be > 0
  p_type              public.wallet_transaction_type,
  p_description       text        default null,
  p_reference         text        default null,
  p_idempotency_key   text        default null,
  p_related_payment_id      uuid  default null,
  p_related_submission_id   uuid  default null,
  p_related_subscription_id uuid  default null,
  p_initiated_by      text        default 'system'
)
returns uuid   -- returns new ledger row id
language plpgsql
security definer
as $$
declare
  v_wallet        public.wallets;
  v_ledger_id     uuid;
begin
  if p_amount <= 0 then
    raise exception 'Credit amount must be positive, got: %', p_amount;
  end if;

  -- Idempotency: if this key was already processed, return existing ledger id
  if p_idempotency_key is not null then
    select id into v_ledger_id
    from public.wallet_ledger
    where idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return v_ledger_id;
    end if;
  end if;

  -- Lock wallet row for update to prevent race conditions
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    -- Auto-create wallet if missing
    perform public.ensure_wallet(p_user_id);
    select * into v_wallet from public.wallets where user_id = p_user_id for update;
  end if;

  if v_wallet.status = 'frozen' then
    raise exception 'Wallet is frozen and cannot receive credits';
  end if;

  -- Create immutable ledger entry FIRST (positive amount = credit)
  insert into public.wallet_ledger (
    wallet_id, user_id, type, status, amount, currency,
    balance_before, balance_after,
    reference, related_payment_id, related_submission_id, related_subscription_id,
    description, idempotency_key, initiated_by
  )
  values (
    v_wallet.id, p_user_id, p_type, 'COMPLETED', p_amount, v_wallet.currency,
    v_wallet.balance, v_wallet.balance + p_amount,
    p_reference, p_related_payment_id, p_related_submission_id, p_related_subscription_id,
    p_description, p_idempotency_key, p_initiated_by
  )
  returning id into v_ledger_id;

  -- Update wallet balance atomically
  update public.wallets
  set balance    = balance + p_amount,
      updated_at = now()
  where id = v_wallet.id;

  return v_ledger_id;
end;
$$;

comment on function public.wallet_credit is
  'Atomic wallet credit. Creates ledger entry and updates balance in one transaction.
   Idempotent when p_idempotency_key is provided.';

-- ── 2. wallet_debit (internal primitive) ─────────────────────────────────────
--
-- Debits an amount from a wallet atomically. Creates ledger entry.
-- REFUSES to create a negative balance (returns error, does NOT debit).

create or replace function public.wallet_debit(
  p_user_id           uuid,
  p_amount            numeric,    -- must be > 0 (will be stored as negative)
  p_type              public.wallet_transaction_type,
  p_description       text        default null,
  p_reference         text        default null,
  p_idempotency_key   text        default null,
  p_related_payment_id      uuid  default null,
  p_related_submission_id   uuid  default null,
  p_related_subscription_id uuid  default null,
  p_initiated_by      text        default 'system'
)
returns uuid   -- returns new ledger row id
language plpgsql
security definer
as $$
declare
  v_wallet    public.wallets;
  v_ledger_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'Debit amount must be positive, got: %', p_amount;
  end if;

  -- Idempotency check
  if p_idempotency_key is not null then
    select id into v_ledger_id
    from public.wallet_ledger
    where idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return v_ledger_id;
    end if;
  end if;

  -- Lock wallet row
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found for user: %', p_user_id;
  end if;

  if v_wallet.status != 'active' then
    raise exception 'Wallet is % and cannot be debited', v_wallet.status;
  end if;

  -- Guard: refuse negative balance
  if v_wallet.balance < p_amount then
    raise exception 'Insufficient wallet balance. Required: %, Available: %',
      p_amount, v_wallet.balance;
  end if;

  -- Create immutable ledger entry (negative amount = debit)
  insert into public.wallet_ledger (
    wallet_id, user_id, type, status, amount, currency,
    balance_before, balance_after,
    reference, related_payment_id, related_submission_id, related_subscription_id,
    description, idempotency_key, initiated_by
  )
  values (
    v_wallet.id, p_user_id, p_type, 'COMPLETED', -p_amount, v_wallet.currency,
    v_wallet.balance, v_wallet.balance - p_amount,
    p_reference, p_related_payment_id, p_related_submission_id, p_related_subscription_id,
    p_description, p_idempotency_key, p_initiated_by
  )
  returning id into v_ledger_id;

  -- Update wallet balance atomically
  update public.wallets
  set balance    = balance - p_amount,
      updated_at = now()
  where id = v_wallet.id;

  return v_ledger_id;
end;
$$;

comment on function public.wallet_debit is
  'Atomic wallet debit. Refuses negative balance. Creates ledger entry in one transaction.
   Idempotent when p_idempotency_key is provided.';

-- ── 3. approve_wallet_topup ───────────────────────────────────────────────────
--
-- Admin-only. Approves a wallet top-up payment submission.
-- Atomically: marks submission approved + credits wallet + ledger + audit + notify.
-- Idempotent: calling twice for the same submission is safe.

create or replace function public.approve_wallet_topup(
  p_submission_id uuid,
  p_admin_id      uuid,
  p_note          text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub       record;
  v_wallet    record;
  v_ledger_id uuid;
  v_idem_key  text;
begin
  -- Security check
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin', 'super_admin')
  ) then
    raise exception 'Permission denied: only admins can approve wallet top-ups';
  end if;

  -- Load and lock submission
  select * into v_sub
  from public.payment_submissions
  where id = p_submission_id
    and purpose = 'wallet_topup'
  for update;

  if not found then
    raise exception 'Wallet top-up submission not found: %', p_submission_id;
  end if;

  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  -- Idempotency key: one credit per submission, ever
  v_idem_key := 'topup:' || p_submission_id::text;

  -- Ensure wallet exists
  perform public.ensure_wallet(v_sub.user_id);

  -- Mark submission approved FIRST (so any retry after crash sees approved)
  update public.payment_submissions set
    status            = 'approved',
    verified_by       = p_admin_id,
    verified_at       = now(),
    verification_note = p_note,
    updated_at        = now()
  where id = p_submission_id;

  -- Credit wallet atomically (idempotent via key)
  v_ledger_id := public.wallet_credit(
    p_user_id               => v_sub.user_id,
    p_amount                => v_sub.topup_amount_etb,
    p_type                  => 'TOP_UP',
    p_description           => 'Wallet top-up approved by admin. Ref: ' || coalesce(v_sub.transaction_ref, '—'),
    p_reference             => v_sub.transaction_ref,
    p_idempotency_key       => v_idem_key,
    p_related_submission_id => p_submission_id,
    p_initiated_by          => 'admin:' || p_admin_id::text
  );

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
    jsonb_build_object(
      'action',            'approve_wallet_topup',
      'submission_id',     p_submission_id,
      'beneficiary_user',  v_sub.user_id,
      'amount_etb',        v_sub.topup_amount_etb,
      'ledger_id',         v_ledger_id,
      'note',              p_note
    ),
    'info'
  );

  -- In-app notification to user
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'wallet_topup_approved',
    'Wallet Topped Up!',
    'ETB ' || v_sub.topup_amount_etb || ' has been added to your wallet.',
    jsonb_build_object(
      'submission_id', p_submission_id,
      'amount_etb',    v_sub.topup_amount_etb,
      'ledger_id',     v_ledger_id
    )
  )
  on conflict do nothing;

  return jsonb_build_object(
    'success',     true,
    'ledger_id',   v_ledger_id,
    'amount_etb',  v_sub.topup_amount_etb,
    'user_id',     v_sub.user_id
  );
end;
$$;

comment on function public.approve_wallet_topup is
  'Admin-only. Approves a wallet top-up submission, credits wallet, creates ledger entry.
   Idempotent — safe to call twice.';

grant execute on function public.approve_wallet_topup(uuid, uuid, text) to authenticated;

-- ── 4. reject_wallet_topup ────────────────────────────────────────────────────
create or replace function public.reject_wallet_topup(
  p_submission_id    uuid,
  p_admin_id         uuid,
  p_rejection_reason text,
  p_custom_note      text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub record;
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin', 'super_admin')
  ) then
    raise exception 'Permission denied: only admins can reject wallet top-ups';
  end if;

  select * into v_sub
  from public.payment_submissions
  where id = p_submission_id
    and purpose = 'wallet_topup'
  for update;

  if not found then
    raise exception 'Wallet top-up submission not found: %', p_submission_id;
  end if;

  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  -- Mark rejected (do NOT credit wallet)
  update public.payment_submissions set
    status                  = 'rejected',
    verified_by             = p_admin_id,
    verified_at             = now(),
    rejection_reason        = p_rejection_reason,
    rejection_reason_custom = p_custom_note,
    updated_at              = now()
  where id = p_submission_id;

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
    jsonb_build_object(
      'action',        'reject_wallet_topup',
      'submission_id', p_submission_id,
      'user_id',       v_sub.user_id,
      'reason',        p_rejection_reason,
      'note',          p_custom_note
    ),
    'warning'
  );

  -- Notify user
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'wallet_topup_rejected',
    'Wallet Top-Up Unsuccessful',
    'Your wallet top-up of ETB ' || v_sub.topup_amount_etb ||
      ' was not approved. Reason: ' || p_rejection_reason,
    jsonb_build_object(
      'submission_id', p_submission_id,
      'amount_etb',    v_sub.topup_amount_etb,
      'reason',        p_rejection_reason
    )
  )
  on conflict do nothing;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.reject_wallet_topup(uuid, uuid, text, text) to authenticated;

-- ── 5. purchase_subscription_with_wallet ─────────────────────────────────────
--
-- User purchases or renews a subscription using their wallet balance.
-- Atomically: debits wallet + creates subscription + ledger + audit + notify.
-- Idempotent via idempotency_key.

create or replace function public.purchase_subscription_with_wallet(
  p_user_id           uuid,
  p_purchase_option_id uuid,  -- from subscription_purchase_options
  p_idempotency_key   text   default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_option      record;
  v_wallet      record;
  v_new_sub_id  uuid;
  v_period_end  timestamptz;
  v_ledger_id   uuid;
  v_idem_key    text;
begin
  -- Validate caller is the user purchasing
  if auth.uid() != p_user_id then
    raise exception 'Users can only purchase subscriptions for themselves';
  end if;

  -- Load purchase option
  select spo.*, sp.name as plan_name, sp.tier as plan_tier
  into v_option
  from public.subscription_purchase_options spo
  join public.subscription_plans sp on sp.id = spo.plan_id
  where spo.id = p_purchase_option_id
    and spo.is_active = true
    and sp.is_active  = true;

  if not found then
    raise exception 'Purchase option not found or inactive: %', p_purchase_option_id;
  end if;

  -- Load wallet (lock for update)
  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'Wallet not found. Please add money to your wallet first.';
  end if;

  if v_wallet.status != 'active' then
    raise exception 'Wallet is % and cannot be used', v_wallet.status;
  end if;

  if v_wallet.balance < v_option.price_etb then
    raise exception 'Insufficient wallet balance. Required: ETB %, Available: ETB %',
      v_option.price_etb, v_wallet.balance;
  end if;

  -- Idempotency key for the debit
  v_idem_key := coalesce(p_idempotency_key, 'sub_purchase:' || p_user_id || ':' || p_purchase_option_id || ':' || extract(epoch from now())::bigint);

  -- Check idempotency key not already used
  if exists (select 1 from public.wallet_ledger where idempotency_key = v_idem_key) then
    raise exception 'This purchase has already been processed (duplicate idempotency key)';
  end if;

  -- Calculate period end
  v_period_end := now() + (v_option.duration_months || ' months')::interval;

  -- Cancel any existing active subscription
  update public.user_subscriptions
  set status       = 'cancelled',
      cancelled_at = now(),
      updated_at   = now()
  where user_id = p_user_id
    and status in ('active', 'trialing', 'paused');

  -- Create new subscription
  insert into public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end,
    duration_months, purchase_option_id, price_paid_etb,
    auto_renew, metadata
  ) values (
    p_user_id, v_option.plan_id, 'active', 'manual',
    now(), v_period_end,
    v_option.duration_months, p_purchase_option_id, v_option.price_etb,
    false,
    jsonb_build_object(
      'purchase_option_id',  p_purchase_option_id,
      'paid_with',          'wallet',
      'duration_months',    v_option.duration_months,
      'price_etb',          v_option.price_etb
    )
  )
  returning id into v_new_sub_id;

  -- Debit wallet atomically
  v_ledger_id := public.wallet_debit(
    p_user_id                 => p_user_id,
    p_amount                  => v_option.price_etb,
    p_type                    => 'SUBSCRIPTION_PURCHASE',
    p_description             => v_option.plan_name || ' — ' || v_option.duration_months || ' month(s)',
    p_idempotency_key         => v_idem_key,
    p_related_subscription_id => v_new_sub_id,
    p_initiated_by            => 'user:' || p_user_id::text
  );

  -- Subscription event
  insert into public.subscription_events (
    subscription_id, user_id, event_type, new_plan_id, triggered_by, metadata
  ) values (
    v_new_sub_id, p_user_id, 'wallet_purchase', v_option.plan_id, 'user',
    jsonb_build_object(
      'purchase_option_id', p_purchase_option_id,
      'duration_months',    v_option.duration_months,
      'price_etb',          v_option.price_etb,
      'ledger_id',          v_ledger_id
    )
  );

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_user_id, 'insert', 'user_subscriptions', v_new_sub_id,
    jsonb_build_object(
      'action',           'wallet_subscription_purchase',
      'plan_name',        v_option.plan_name,
      'duration_months',  v_option.duration_months,
      'price_etb',        v_option.price_etb,
      'ledger_id',        v_ledger_id
    ),
    'info'
  );

  -- Notify user
  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_user_id,
    'subscription_activated',
    v_option.plan_name || ' Plan Activated!',
    'Your ' || v_option.plan_name || ' subscription (' ||
      v_option.duration_months || ' month(s)) is now active. ETB ' ||
      v_option.price_etb || ' deducted from your wallet.',
    jsonb_build_object(
      'subscription_id',    v_new_sub_id,
      'plan_name',          v_option.plan_name,
      'duration_months',    v_option.duration_months,
      'price_etb',          v_option.price_etb,
      'period_end',         v_period_end
    )
  )
  on conflict do nothing;

  return jsonb_build_object(
    'success',         true,
    'subscription_id', v_new_sub_id,
    'period_end',      v_period_end,
    'amount_debited',  v_option.price_etb,
    'ledger_id',       v_ledger_id
  );
end;
$$;

comment on function public.purchase_subscription_with_wallet is
  'User purchases a subscription using their wallet balance.
   Atomic: debit + create subscription + ledger + audit + notify.
   Prevents negative balance. Idempotent via idempotency_key.';

grant execute on function public.purchase_subscription_with_wallet(uuid, uuid, text) to authenticated;

-- ── 6. wallet_adjustment (admin only) ────────────────────────────────────────
--
-- Admin creates an ADJUSTMENT or REVERSAL entry.
-- Admins CANNOT silently edit balances or ledger history.
-- This is the only sanctioned correction method.

create or replace function public.wallet_adjustment(
  p_admin_id    uuid,
  p_user_id     uuid,
  p_amount      numeric,   -- positive = credit, negative = debit
  p_type        public.wallet_transaction_type,  -- 'ADJUSTMENT' or 'REVERSAL'
  p_description text,
  p_reference   text        default null,
  p_reverses    uuid        default null  -- wallet_ledger id being reversed
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_ledger_id uuid;
begin
  -- Security check
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin', 'super_admin')
  ) then
    raise exception 'Permission denied: only admins can create wallet adjustments';
  end if;

  if p_type not in ('ADJUSTMENT', 'REVERSAL', 'REFUND') then
    raise exception 'wallet_adjustment only accepts ADJUSTMENT, REVERSAL, or REFUND types';
  end if;

  if p_amount = 0 then
    raise exception 'Adjustment amount cannot be zero';
  end if;

  -- If reversing, validate the ledger entry exists
  if p_reverses is not null and not exists (
    select 1 from public.wallet_ledger where id = p_reverses
  ) then
    raise exception 'Referenced ledger entry not found: %', p_reverses;
  end if;

  -- Apply credit or debit
  if p_amount > 0 then
    v_ledger_id := public.wallet_credit(
      p_user_id       => p_user_id,
      p_amount        => p_amount,
      p_type          => p_type,
      p_description   => p_description,
      p_reference     => p_reference,
      p_initiated_by  => 'admin:' || p_admin_id::text
    );
  else
    v_ledger_id := public.wallet_debit(
      p_user_id       => p_user_id,
      p_amount        => abs(p_amount),
      p_type          => p_type,
      p_description   => p_description,
      p_reference     => p_reference,
      p_initiated_by  => 'admin:' || p_admin_id::text
    );
  end if;

  -- Link reversal references
  if p_reverses is not null then
    -- Mark the original entry as REVERSED (this uses a special internal update)
    -- We bypass the immutability trigger by updating only the status field
    -- via a direct update on the row we own (security definer context)
    -- NOTE: we add a policy-bypass column to mark reversals without editing history
    update public.wallet_ledger
    set reversed_by = v_ledger_id
    where id = p_reverses;
    -- Also link the new entry back
    update public.wallet_ledger
    set reverses = p_reverses
    where id = v_ledger_id;
    -- Mark original as REVERSED status
    update public.wallet_ledger
    set status = 'REVERSED'
    where id = p_reverses;
  end if;

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_admin_id, 'admin_action', 'wallet_ledger', v_ledger_id,
    jsonb_build_object(
      'action',       'wallet_adjustment',
      'type',         p_type,
      'target_user',  p_user_id,
      'amount',       p_amount,
      'description',  p_description,
      'reverses',     p_reverses
    ),
    case when p_type = 'REVERSAL' then 'warning' else 'info' end
  );

  return jsonb_build_object(
    'success',    true,
    'ledger_id',  v_ledger_id,
    'amount',     p_amount
  );
end;
$$;

comment on function public.wallet_adjustment is
  'Admin-only. Creates ADJUSTMENT, REVERSAL, or REFUND wallet entries.
   The only sanctioned way to correct wallet history. Creates full audit trail.';

grant execute on function public.wallet_adjustment(uuid, uuid, numeric, public.wallet_transaction_type, text, text, uuid) to authenticated;

-- ── 7. Override immutability trigger to allow reversal status updates ─────────
-- The wallet_adjustment function uses security definer context, which bypasses RLS,
-- but the immutability trigger runs on all sessions. We need to allow status
-- and reversed_by updates when called from security definer functions.
-- Solution: replace the trigger to allow changes ONLY to reversal-tracking columns.

create or replace function public.prevent_wallet_ledger_modification()
returns trigger language plpgsql as $$
begin
  -- Allow only reversal-tracking field updates (from security definer context)
  -- These are the ONLY permitted modifications to a ledger row after creation
  if (
    old.wallet_id           = new.wallet_id and
    old.user_id             = new.user_id and
    old.type                = new.type and
    old.amount              = new.amount and
    old.currency            = new.currency and
    old.balance_before      = new.balance_before and
    old.balance_after       = new.balance_after and
    old.reference           is not distinct from new.reference and
    old.description         is not distinct from new.description and
    old.idempotency_key     is not distinct from new.idempotency_key and
    old.created_at          = new.created_at
  ) then
    -- Only reversal-tracking columns changed: allow it
    return new;
  end if;

  raise exception 'wallet_ledger transaction fields are immutable — use REVERSAL or ADJUSTMENT transactions';
end;
$$;

notify pgrst, 'reload schema';
