-- ============================================================
--  Migration: Patch approve_payment_submission for duration support
--  Phase 14.5 — FitTrack Pro
--
--  The original approve_payment_submission() RPC (Phase 13) hardcoded
--  a 30-day period end and did not know about:
--    - subscription_purchase_options (duration / price)
--    - wallet credits on approval (purpose = subscription_purchase)
--    - the new duration_months + price_paid_etb columns on user_subscriptions
--
--  This migration replaces the function with a version that:
--    1. Reads the purchase_option_id from the submission metadata (if any),
--       or falls back to the 1-month option for the plan.
--    2. Sets duration_months and price_paid_etb on the new subscription.
--    3. Calculates period_end correctly based on duration_months.
--    4. Remains fully backward-compatible with existing submissions that
--       have no purchase_option_id (they just get 1-month default).
--
--  Also adds:
--    5. purchase_option_id column on payment_submissions (optional reference)
--       so the frontend can pass the chosen duration at submission time.
-- ============================================================

-- ── 1. Add purchase_option_id to payment_submissions ─────────────────────────
alter table public.payment_submissions
  add column if not exists purchase_option_id uuid
    references public.subscription_purchase_options(id) on delete set null;

comment on column public.payment_submissions.purchase_option_id is
  'The subscription_purchase_options row selected by the user. 
   Determines duration and price used on approval.';

create index if not exists idx_payment_submissions_option_id
  on public.payment_submissions(purchase_option_id) where purchase_option_id is not null;

-- ── 2. Replace approve_payment_submission ────────────────────────────────────
create or replace function public.approve_payment_submission(
  p_submission_id   uuid,
  p_admin_id        uuid,
  p_note            text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub           record;
  v_option        record;
  v_new_sub_id    uuid;
  v_period_end    timestamptz;
  v_duration_months integer;
begin
  -- ── Security ────────────────────────────────────────────────────────────────
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin', 'super_admin')
  ) then
    raise exception 'Permission denied: only admins can approve payments';
  end if;

  -- ── Load submission (subscription_purchase only) ────────────────────────────
  select * into v_sub
  from public.payment_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Submission not found: %', p_submission_id;
  end if;

  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  -- Route wallet top-ups to the dedicated function
  if v_sub.purpose = 'wallet_topup' then
    return public.approve_wallet_topup(p_submission_id, p_admin_id, p_note);
  end if;

  -- ── Resolve purchase option → duration + price ──────────────────────────────
  -- Priority: submission.purchase_option_id → 1-month option for plan → fallback 30d
  if v_sub.purchase_option_id is not null then
    select * into v_option
    from public.subscription_purchase_options
    where id = v_sub.purchase_option_id;
  end if;

  if not found or v_option is null then
    -- Fallback: 1-month option for this plan
    select * into v_option
    from public.subscription_purchase_options
    where plan_id   = v_sub.plan_id
      and duration  = '1_month'
      and is_active = true
    limit 1;
  end if;

  if not found or v_option is null then
    -- Last fallback: any active option for plan (shortest duration)
    select * into v_option
    from public.subscription_purchase_options
    where plan_id  = v_sub.plan_id
      and is_active = true
    order by duration_months asc
    limit 1;
  end if;

  -- Determine duration_months
  v_duration_months := coalesce(v_option.duration_months, 1);
  v_period_end      := now() + (v_duration_months || ' months')::interval;

  -- ── Mark submission APPROVED ────────────────────────────────────────────────
  update public.payment_submissions set
    status            = 'approved',
    verified_by       = p_admin_id,
    verified_at       = now(),
    verification_note = p_note,
    updated_at        = now()
  where id = p_submission_id;

  -- ── Cancel any existing active subscription for this user ───────────────────
  update public.user_subscriptions set
    status       = 'cancelled',
    cancelled_at = now(),
    updated_at   = now()
  where user_id = v_sub.user_id
    and status in ('active', 'trialing', 'paused');

  -- ── Create new subscription with correct duration ────────────────────────────
  insert into public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end,
    duration_months, purchase_option_id, price_paid_etb,
    auto_renew,
    metadata
  ) values (
    v_sub.user_id,
    v_sub.plan_id,
    'active',
    'manual',
    now(),
    v_period_end,
    v_duration_months,
    v_sub.purchase_option_id,
    -- Use amount_etb from submission as price paid snapshot
    v_sub.amount_etb,
    -- Auto-renew defaults to false; user enables it separately
    false,
    jsonb_build_object(
      'payment_submission_id',  p_submission_id,
      'approved_by',            p_admin_id,
      'purchase_option_id',     v_sub.purchase_option_id,
      'duration_months',        v_duration_months
    )
  )
  returning id into v_new_sub_id;

  -- ── Link subscription to submission ─────────────────────────────────────────
  update public.payment_submissions
  set subscription_id = v_new_sub_id
  where id = p_submission_id;

  -- ── Create payment record ────────────────────────────────────────────────────
  insert into public.payments (
    user_id, subscription_id, provider, provider_payment_id,
    amount_usd, currency, status, description
  ) values (
    v_sub.user_id,
    v_new_sub_id,
    'manual',
    v_sub.transaction_ref,
    v_sub.amount_etb,
    v_sub.currency,
    'succeeded',
    'Manual payment verified by admin. Duration: ' || v_duration_months ||
      ' month(s). Ref: ' || coalesce(v_sub.transaction_ref, '—')
  );

  -- ── Subscription event ───────────────────────────────────────────────────────
  insert into public.subscription_events (
    subscription_id, user_id, event_type, new_plan_id, triggered_by, metadata
  ) values (
    v_new_sub_id,
    v_sub.user_id,
    'approved_manual_payment',
    v_sub.plan_id,
    'admin',
    jsonb_build_object(
      'submission_id',     p_submission_id,
      'admin_id',          p_admin_id,
      'duration_months',   v_duration_months,
      'note',              p_note
    )
  );

  -- ── Audit log ────────────────────────────────────────────────────────────────
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_admin_id,
    'admin_action',
    'payment_submissions',
    p_submission_id,
    jsonb_build_object(
      'action',            'approve',
      'previous_status',   'pending_verification',
      'new_status',        'approved',
      'subscription_id',   v_new_sub_id,
      'duration_months',   v_duration_months,
      'note',              p_note
    ),
    'info'
  );

  -- ── In-app notification ───────────────────────────────────────────────────────
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'payment_approved',
    'Payment Approved!',
    'Your subscription has been activated for ' || v_duration_months ||
      ' month(s). Enjoy FitTrack Pro!',
    jsonb_build_object(
      'submission_id',   p_submission_id,
      'duration_months', v_duration_months,
      'period_end',      v_period_end
    )
  )
  on conflict do nothing;

  return jsonb_build_object(
    'success',         true,
    'subscription_id', v_new_sub_id,
    'period_end',      v_period_end,
    'duration_months', v_duration_months
  );
end;
$$;

grant execute on function public.approve_payment_submission(uuid, uuid, text) to authenticated;

-- ── 3. Convenience: get_wallet_balance (safe read for any user) ──────────────
--
-- Returns the user's wallet balance (or 0 if no wallet yet).
-- Used by frontend to show balance before purchase.

create or replace function public.get_wallet_balance(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_wallet record;
begin
  -- Users can only read their own balance; admins can read anyone's
  if auth.uid() != p_user_id and not exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin', 'super_admin')
  ) then
    raise exception 'Permission denied';
  end if;

  select * into v_wallet from public.wallets where user_id = p_user_id;

  if not found then
    return jsonb_build_object(
      'exists',    false,
      'balance',   0,
      'currency',  'ETB',
      'status',    'active'
    );
  end if;

  return jsonb_build_object(
    'exists',    true,
    'wallet_id', v_wallet.id,
    'balance',   v_wallet.balance,
    'currency',  v_wallet.currency,
    'status',    v_wallet.status
  );
end;
$$;

grant execute on function public.get_wallet_balance(uuid) to authenticated;

-- ── 4. update_auto_renew (user toggles their own auto-renew setting) ─────────
create or replace function public.update_auto_renew(
  p_user_id       uuid,
  p_auto_renew    boolean
)
returns void
language plpgsql
security definer
as $$
begin
  -- Users can only update their own setting
  if auth.uid() != p_user_id then
    raise exception 'Permission denied';
  end if;

  update public.user_subscriptions
  set auto_renew = p_auto_renew,
      updated_at = now()
  where user_id = p_user_id
    and status in ('active', 'trialing');

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, metadata, severity
  ) values (
    p_user_id, 'update', 'user_subscriptions',
    jsonb_build_object('action', 'toggle_auto_renew', 'auto_renew', p_auto_renew),
    'info'
  );
end;
$$;

grant execute on function public.update_auto_renew(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
