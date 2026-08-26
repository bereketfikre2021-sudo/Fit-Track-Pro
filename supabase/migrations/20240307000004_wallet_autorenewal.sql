-- ============================================================
--  Migration: Wallet Auto-Renewal
--  Phase 14.5 — FitTrack Pro
--
--  Adds:
--    1. process_wallet_autorenewal()  — renews one subscription from wallet
--    2. run_wallet_autorenewal()      — batch job: finds all due auto-renewals
--    3. pg_cron schedule for auto-renewal (hourly, alongside expiry check)
--    4. v_auto_renewal_status view   — user-facing renewal info
--    5. v_admin_autorenewal_monitor  — admin monitoring view
-- ============================================================

-- ── 1. process_wallet_autorenewal ─────────────────────────────────────────────
--
-- Renews a single subscription from the user's wallet.
-- Idempotent: keyed on subscription_id + renewal period date.
-- Called by run_wallet_autorenewal() and can also be called manually.

create or replace function public.process_wallet_autorenewal(
  p_subscription_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub           record;
  v_option        record;
  v_wallet        record;
  v_new_sub_id    uuid;
  v_period_end    timestamptz;
  v_ledger_id     uuid;
  v_idem_key      text;
  v_renewal_date  text;
begin
  -- Load subscription with plan and purchase option details
  select
    us.*,
    sp.name  as plan_name,
    sp.tier  as plan_tier
  into v_sub
  from public.user_subscriptions us
  join public.subscription_plans sp on sp.id = us.plan_id
  where us.id = p_subscription_id
  for update;

  if not found then
    raise exception 'Subscription not found: %', p_subscription_id;
  end if;

  -- Only auto-renew subscriptions with auto_renew = true
  if not v_sub.auto_renew then
    return jsonb_build_object('success', false, 'reason', 'auto_renew_disabled');
  end if;

  -- Only renew active/trialing subscriptions that are at or past their period end
  if v_sub.status not in ('active', 'trialing', 'expired') then
    return jsonb_build_object('success', false, 'reason', 'subscription_status_' || v_sub.status);
  end if;

  -- Determine renewal date key for idempotency
  v_renewal_date := to_char(coalesce(v_sub.current_period_end, now()), 'YYYY-MM-DD');
  v_idem_key     := 'autorenewal:' || p_subscription_id::text || ':' || v_renewal_date;

  -- Idempotency: if already renewed this period, skip
  if exists (
    select 1 from public.wallet_ledger
    where idempotency_key = v_idem_key
  ) then
    return jsonb_build_object('success', false, 'reason', 'already_renewed', 'idempotency_key', v_idem_key);
  end if;

  -- Determine renewal price:
  -- 1. Use the purchase_option_id stored on the subscription (preserves duration)
  -- 2. Fallback to 1-month option for the same plan
  if v_sub.purchase_option_id is not null then
    select * into v_option
    from public.subscription_purchase_options
    where id = v_sub.purchase_option_id
      and is_active = true;
  end if;

  if not found or v_option is null then
    -- Fallback: cheapest active option for this plan (1 month)
    select * into v_option
    from public.subscription_purchase_options
    where plan_id   = v_sub.plan_id
      and duration  = '1_month'
      and is_active = true;
  end if;

  if not found or v_option is null then
    -- Last fallback: any active option
    select * into v_option
    from public.subscription_purchase_options
    where plan_id  = v_sub.plan_id
      and is_active = true
    order by duration_months asc
    limit 1;
  end if;

  if not found or v_option is null then
    -- Cannot determine renewal price — notify user
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_sub.user_id,
      'autorenewal_failed',
      'Auto-Renewal Failed',
      'We could not determine the renewal price for your ' || v_sub.plan_name || ' plan.',
      jsonb_build_object('subscription_id', p_subscription_id, 'reason', 'no_price_option')
    ) on conflict do nothing;
    return jsonb_build_object('success', false, 'reason', 'no_price_option');
  end if;

  -- Check wallet exists and has sufficient balance
  select * into v_wallet
  from public.wallets
  where user_id = v_sub.user_id
  for update;

  if not found then
    -- No wallet — notify user
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_sub.user_id,
      'autorenewal_failed',
      'Auto-Renewal Failed — No Wallet',
      'Your ' || v_sub.plan_name || ' subscription could not be renewed. Please add money to your wallet.',
      jsonb_build_object(
        'subscription_id', p_subscription_id,
        'plan_name',       v_sub.plan_name,
        'amount_required', v_option.price_etb,
        'reason',          'no_wallet'
      )
    ) on conflict do nothing;
    return jsonb_build_object('success', false, 'reason', 'no_wallet');
  end if;

  -- Insufficient balance — do NOT create negative balance, notify user
  if v_wallet.balance < v_option.price_etb then
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_sub.user_id,
      'autorenewal_insufficient_balance',
      'Insufficient Wallet Balance for Auto-Renewal',
      'Your wallet balance (ETB ' || v_wallet.balance || ') is not enough to renew your ' ||
        v_sub.plan_name || ' plan (ETB ' || v_option.price_etb || '). Please top up your wallet.',
      jsonb_build_object(
        'subscription_id', p_subscription_id,
        'plan_name',       v_sub.plan_name,
        'renewal_amount',  v_option.price_etb,
        'wallet_balance',  v_wallet.balance,
        'shortfall',       v_option.price_etb - v_wallet.balance
      )
    ) on conflict do nothing;
    return jsonb_build_object(
      'success',          false,
      'reason',           'insufficient_balance',
      'required',         v_option.price_etb,
      'available',        v_wallet.balance,
      'shortfall',        v_option.price_etb - v_wallet.balance
    );
  end if;

  -- ── Sufficient balance — proceed with renewal ──────────────────────────────

  -- Calculate new period end from now (or from period_end if it hasn't expired yet)
  if v_sub.current_period_end is not null and v_sub.current_period_end > now() then
    v_period_end := v_sub.current_period_end + (v_option.duration_months || ' months')::interval;
  else
    v_period_end := now() + (v_option.duration_months || ' months')::interval;
  end if;

  -- Update the subscription (extend period, reactivate if expired)
  update public.user_subscriptions
  set status               = 'active',
      current_period_start = now(),
      current_period_end   = v_period_end,
      cancel_at_period_end = false,
      price_paid_etb       = v_option.price_etb,
      duration_months      = v_option.duration_months,
      updated_at           = now()
  where id = p_subscription_id
  returning id into v_new_sub_id;

  -- Debit wallet atomically with idempotency key
  v_ledger_id := public.wallet_debit(
    p_user_id                 => v_sub.user_id,
    p_amount                  => v_option.price_etb,
    p_type                    => 'SUBSCRIPTION_RENEWAL',
    p_description             => 'Auto-renewal: ' || v_sub.plan_name || ' — ' || v_option.duration_months || ' month(s)',
    p_idempotency_key         => v_idem_key,
    p_related_subscription_id => p_subscription_id,
    p_initiated_by            => 'system:autorenewal'
  );

  -- Subscription event
  insert into public.subscription_events (
    subscription_id, user_id, event_type, new_plan_id, old_plan_id, triggered_by, metadata
  ) values (
    p_subscription_id, v_sub.user_id, 'auto_renewed', v_sub.plan_id, v_sub.plan_id, 'system',
    jsonb_build_object(
      'duration_months', v_option.duration_months,
      'price_etb',       v_option.price_etb,
      'ledger_id',       v_ledger_id,
      'period_end',      v_period_end,
      'idempotency_key', v_idem_key
    )
  );

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    v_sub.user_id, 'update', 'user_subscriptions', p_subscription_id,
    jsonb_build_object(
      'action',          'auto_renewal',
      'plan_name',       v_sub.plan_name,
      'duration_months', v_option.duration_months,
      'price_etb',       v_option.price_etb,
      'ledger_id',       v_ledger_id,
      'period_end',      v_period_end
    ),
    'info'
  );

  -- Success notification
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'autorenewal_success',
    'Subscription Renewed!',
    'Your ' || v_sub.plan_name || ' plan has been automatically renewed for ' ||
      v_option.duration_months || ' month(s). ETB ' || v_option.price_etb || ' deducted from your wallet.',
    jsonb_build_object(
      'subscription_id', p_subscription_id,
      'plan_name',       v_sub.plan_name,
      'duration_months', v_option.duration_months,
      'price_etb',       v_option.price_etb,
      'period_end',      v_period_end,
      'ledger_id',       v_ledger_id
    )
  ) on conflict do nothing;

  return jsonb_build_object(
    'success',         true,
    'subscription_id', p_subscription_id,
    'period_end',      v_period_end,
    'amount_debited',  v_option.price_etb,
    'ledger_id',       v_ledger_id
  );
end;
$$;

comment on function public.process_wallet_autorenewal is
  'Processes auto-renewal for a single subscription. Idempotent — safe to call multiple times.
   Returns failure JSON (not exception) when balance is insufficient — never creates negative balance.';

grant execute on function public.process_wallet_autorenewal(uuid) to service_role;

-- ── 2. run_wallet_autorenewal (batch job) ─────────────────────────────────────
--
-- Finds all active subscriptions where:
--   - auto_renew = true
--   - current_period_end is within the next 1 hour (due soon) OR already passed
-- Calls process_wallet_autorenewal() for each one.

create or replace function public.run_wallet_autorenewal()
returns integer
language plpgsql
security definer
as $$
declare
  v_count  integer := 0;
  v_rec    record;
  v_result jsonb;
begin
  for v_rec in
    select us.id
    from public.user_subscriptions us
    where us.auto_renew = true
      and us.status in ('active', 'trialing', 'expired')
      and (
        -- Due: period has ended
        us.current_period_end < now()
        or
        -- Due soon: within 1 hour (process proactively)
        us.current_period_end <= now() + interval '1 hour'
      )
      -- Not yet renewed this period (check idempotency key would exist)
      and not exists (
        select 1 from public.wallet_ledger wl
        where wl.related_subscription_id = us.id
          and wl.type = 'SUBSCRIPTION_RENEWAL'
          and wl.idempotency_key = 'autorenewal:' || us.id::text || ':' ||
              to_char(coalesce(us.current_period_end, now()), 'YYYY-MM-DD')
          and wl.status = 'COMPLETED'
      )
    order by us.current_period_end asc
    limit 500   -- safety cap per run
  loop
    begin
      v_result := public.process_wallet_autorenewal(v_rec.id);
      if (v_result->>'success')::boolean then
        v_count := v_count + 1;
      end if;
    exception when others then
      -- Log individual failures without stopping the batch
      insert into public.audit_logs (
        user_id, action, table_name, record_id, metadata, severity
      )
      select
        us.user_id, 'update', 'user_subscriptions', v_rec.id,
        jsonb_build_object(
          'action', 'autorenewal_batch_error',
          'subscription_id', v_rec.id,
          'error', sqlerrm
        ),
        'error'
      from public.user_subscriptions us
      where us.id = v_rec.id;
    end;
  end loop;

  return v_count;
end;
$$;

comment on function public.run_wallet_autorenewal() is
  'Batch auto-renewal job. Processes all subscriptions due for renewal.
   Called hourly by pg_cron. Returns count of successful renewals.';

grant execute on function public.run_wallet_autorenewal() to service_role;

-- ── 3. Schedule auto-renewal cron (hourly) ────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('wallet-autorenewal')
    where exists (select 1 from cron.job where jobname = 'wallet-autorenewal');

    perform cron.schedule(
      'wallet-autorenewal',
      '30 * * * *',   -- every hour at :30 (offset from expire_subscriptions at :00)
      $$select public.run_wallet_autorenewal();$$
    );
  end if;
end;
$$;

-- ── 4. Low balance warning function ──────────────────────────────────────────
--
-- Sends a warning to users with auto-renew enabled whose wallet
-- balance is below their upcoming renewal price.
-- Schedule daily at 8:00 AM UTC.

create or replace function public.notify_low_wallet_balance()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_rec   record;
begin
  for v_rec in
    select
      us.id    as sub_id,
      us.user_id,
      us.plan_id,
      us.purchase_option_id,
      us.current_period_end,
      sp.name  as plan_name,
      w.balance as wallet_balance,
      spo.price_etb as renewal_price,
      spo.duration_months
    from public.user_subscriptions us
    join public.subscription_plans sp on sp.id = us.plan_id
    join public.wallets w on w.user_id = us.user_id
    left join public.subscription_purchase_options spo
      on spo.id = us.purchase_option_id and spo.is_active = true
    where us.auto_renew = true
      and us.status in ('active', 'trialing')
      and us.current_period_end is not null
      and us.current_period_end > now()
      and us.current_period_end <= now() + interval '7 days'
      and spo.price_etb is not null
      and w.balance < spo.price_etb
      -- Don't spam: no low-balance warning in last 3 days
      and not exists (
        select 1 from public.notifications n
        where n.user_id = us.user_id
          and n.type = 'wallet_low_balance_warning'
          and n.created_at > now() - interval '3 days'
      )
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (
      v_rec.user_id,
      'wallet_low_balance_warning',
      'Low Wallet Balance — Renewal at Risk',
      'Your wallet balance (ETB ' || v_rec.wallet_balance ||
        ') may not be enough to renew your ' || v_rec.plan_name ||
        ' plan (ETB ' || v_rec.renewal_price || '). Top up now to avoid interruption.',
      jsonb_build_object(
        'subscription_id',  v_rec.sub_id,
        'plan_name',        v_rec.plan_name,
        'renewal_amount',   v_rec.renewal_price,
        'wallet_balance',   v_rec.wallet_balance,
        'shortfall',        v_rec.renewal_price - v_rec.wallet_balance,
        'renewal_date',     v_rec.current_period_end
      )
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.notify_low_wallet_balance() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('wallet-low-balance-warning')
    where exists (select 1 from cron.job where jobname = 'wallet-low-balance-warning');

    perform cron.schedule(
      'wallet-low-balance-warning',
      '0 8 * * *',  -- daily at 8:00 AM UTC
      $$select public.notify_low_wallet_balance();$$
    );
  end if;
end;
$$;

-- ── 5. v_auto_renewal_status (user-facing) ────────────────────────────────────
create or replace view public.v_auto_renewal_status as
select
  us.id                  as subscription_id,
  us.user_id,
  sp.name                as plan_name,
  sp.tier                as plan_tier,
  us.status              as subscription_status,
  us.auto_renew,
  us.current_period_end  as next_renewal_date,
  us.duration_months,
  spo.price_etb          as renewal_price_etb,
  spo.duration_months    as renewal_duration_months,
  w.balance              as wallet_balance,
  w.currency             as wallet_currency,
  -- Is balance sufficient?
  case
    when spo.price_etb is null then null
    when w.balance >= spo.price_etb then true
    else false
  end                    as balance_sufficient,
  -- Shortfall (positive when insufficient)
  case
    when spo.price_etb is null then null
    when w.balance < spo.price_etb then spo.price_etb - w.balance
    else 0
  end                    as shortfall_etb
from public.user_subscriptions us
join public.subscription_plans sp on sp.id = us.plan_id
left join public.subscription_purchase_options spo
  on spo.id = us.purchase_option_id and spo.is_active = true
left join public.wallets w on w.user_id = us.user_id
where us.status in ('active', 'trialing');

comment on view public.v_auto_renewal_status is
  'Per-user auto-renewal status: next renewal date, price, wallet balance, shortfall.';

-- ── 6. v_admin_autorenewal_monitor ────────────────────────────────────────────
create or replace view public.v_admin_autorenewal_monitor as
select
  us.id                  as subscription_id,
  us.user_id,
  us.auto_renew,
  us.status              as subscription_status,
  us.current_period_end  as renewal_due,
  sp.name                as plan_name,
  spo.price_etb          as renewal_price_etb,
  w.balance              as wallet_balance,
  case
    when w.balance >= coalesce(spo.price_etb, 0) then 'sufficient'
    else 'insufficient'
  end                    as balance_status,
  coalesce(spo.price_etb, 0) - coalesce(w.balance, 0) as shortfall_etb,
  -- days until renewal
  floor(extract(epoch from (us.current_period_end - now())) / 86400) as days_until_renewal
from public.user_subscriptions us
join public.subscription_plans sp on sp.id = us.plan_id
left join public.subscription_purchase_options spo
  on spo.id = us.purchase_option_id and spo.is_active = true
left join public.wallets w on w.user_id = us.user_id
where us.auto_renew = true
  and us.status in ('active', 'trialing')
order by us.current_period_end asc;

comment on view public.v_admin_autorenewal_monitor is
  'Admin view of all users with auto-renew enabled, their balance status, and days until renewal.';

grant select on public.v_auto_renewal_status        to authenticated;
grant select on public.v_admin_autorenewal_monitor  to authenticated;

notify pgrst, 'reload schema';
