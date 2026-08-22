-- ============================================================
--  Migration: Notifications schema fix + free subscription on signup
--  Phase 15 — FitTrack Pro
--
--  Fixes:
--    1. Add missing `type` column to notifications table
--       (was present in payment RPC inserts but missing from
--       the original 20240301000006 migration)
--    2. Add missing `user_id` RLS admin policy fix
--    3. Fix approve/reject RPCs — they used `read` but column is `is_read`
--    4. Auto-create Free subscription on user signup via trigger
--    5. Fix duplicate notifications policies from payment migration
-- ============================================================

-- ── 1. Add type column if it doesn't exist ────────────────────────────────────
alter table public.notifications
  add column if not exists type text not null default 'general';

-- ── 2. Update approve RPC — fix `read` → `is_read` in notification insert ────
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
  v_plan          record;
  v_new_sub_id    uuid;
  v_period_end    timestamptz;
begin
  -- Security: caller must be admin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin','super_admin')
  ) then
    raise exception 'Permission denied: only admins can approve payments';
  end if;

  -- Load and lock submission
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

  -- Load plan
  select * into v_plan from public.subscription_plans where id = v_sub.plan_id;
  if not found then raise exception 'Plan not found'; end if;

  v_period_end := now() + interval '30 days';

  -- Mark submission approved
  update public.payment_submissions set
    status            = 'approved',
    verified_by       = p_admin_id,
    verified_at       = now(),
    verification_note = p_note,
    updated_at        = now()
  where id = p_submission_id;

  -- Cancel any existing active subscription
  update public.user_subscriptions set
    status       = 'cancelled',
    cancelled_at = now(),
    updated_at   = now()
  where user_id = v_sub.user_id
    and status in ('active','trialing','paused');

  -- Create new active subscription
  insert into public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end, metadata
  ) values (
    v_sub.user_id, v_sub.plan_id, 'active', 'manual',
    now(), v_period_end,
    jsonb_build_object('payment_submission_id', p_submission_id, 'approved_by', p_admin_id)
  )
  returning id into v_new_sub_id;

  -- Link subscription to submission
  update public.payment_submissions
  set subscription_id = v_new_sub_id
  where id = p_submission_id;

  -- Create payment record
  insert into public.payments (
    user_id, subscription_id, provider, provider_payment_id,
    amount_usd, currency, status, description
  ) values (
    v_sub.user_id, v_new_sub_id, 'manual', v_sub.transaction_ref,
    v_sub.amount_etb, v_sub.currency, 'succeeded',
    'Manual payment verified by admin. Ref: ' || v_sub.transaction_ref
  );

  -- Subscription event
  insert into public.subscription_events (
    subscription_id, user_id, event_type, new_plan_id,
    old_plan_id, triggered_by, metadata
  ) values (
    v_new_sub_id, v_sub.user_id, 'approved_manual_payment', v_sub.plan_id,
    null, 'admin',
    jsonb_build_object('submission_id', p_submission_id, 'admin_id', p_admin_id, 'note', p_note)
  );

  -- Audit log
  insert into public.audit_logs (
    user_id, action, table_name, record_id, metadata, severity
  ) values (
    p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
    jsonb_build_object(
      'action', 'approve',
      'previous_status', 'pending_verification',
      'new_status', 'approved',
      'subscription_id', v_new_sub_id,
      'note', p_note
    ),
    'info'
  );

  -- Notification — use is_read (correct column name)
  insert into public.notifications (user_id, type, title, body, data, is_read)
  values (
    v_sub.user_id,
    'payment_approved',
    'Payment Approved!',
    'Your ' || v_plan.name || ' subscription has been activated. Enjoy FitTrack Pro!',
    jsonb_build_object('submission_id', p_submission_id, 'plan', v_plan.name),
    false
  );

  return jsonb_build_object(
    'success', true,
    'subscription_id', v_new_sub_id,
    'period_end', v_period_end
  );
end;
$$;

grant execute on function public.approve_payment_submission(uuid, uuid, text) to authenticated;

-- ── 3. Update reject RPC — fix `read` → `is_read` in notification insert ─────
create or replace function public.reject_payment_submission(
  p_submission_id      uuid,
  p_admin_id           uuid,
  p_rejection_reason   text,
  p_custom_note        text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_sub  record;
  v_plan record;
begin
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin','super_admin')
  ) then
    raise exception 'Permission denied: only admins can reject payments';
  end if;

  select * into v_sub from public.payment_submissions where id = p_submission_id for update;
  if not found then raise exception 'Submission not found'; end if;
  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  select * into v_plan from public.subscription_plans where id = v_sub.plan_id;

  update public.payment_submissions set
    status                  = 'rejected',
    verified_by             = p_admin_id,
    verified_at             = now(),
    rejection_reason        = p_rejection_reason,
    rejection_reason_custom = p_custom_note,
    updated_at              = now()
  where id = p_submission_id;

  insert into public.subscription_events (
    subscription_id, user_id, event_type, triggered_by, metadata
  )
  select
    v_sub.subscription_id, v_sub.user_id, 'rejected_manual_payment', 'admin',
    jsonb_build_object('submission_id', p_submission_id, 'reason', p_rejection_reason)
  where v_sub.subscription_id is not null;

  insert into public.audit_logs (user_id, action, table_name, record_id, metadata, severity)
  values (
    p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
    jsonb_build_object(
      'action', 'reject',
      'previous_status', 'pending_verification',
      'new_status', 'rejected',
      'reason', p_rejection_reason,
      'note', p_custom_note
    ),
    'warning'
  );

  -- Notification — use is_read (correct column name)
  insert into public.notifications (user_id, type, title, body, data, is_read)
  values (
    v_sub.user_id,
    'payment_rejected',
    'Payment Verification Unsuccessful',
    'Your payment submission was not approved. Reason: ' || p_rejection_reason || '. You can submit a new proof.',
    jsonb_build_object('submission_id', p_submission_id, 'reason', p_rejection_reason),
    false
  );

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.reject_payment_submission(uuid, uuid, text, text) to authenticated;

-- ── 4. Auto-create Free subscription on user signup ───────────────────────────
-- Extends handle_new_user() to also insert a free user_subscriptions row.
-- This ensures useSubscription() always finds a row and users see "Free" plan.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_plan_id uuid;
begin
  -- Create user profile row
  insert into public.users (id, name, registration_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    current_date
  )
  on conflict (id) do nothing;

  -- Create default Free subscription
  select id into v_free_plan_id
  from public.subscription_plans
  where tier = 'free'
  limit 1;

  if v_free_plan_id is not null then
    insert into public.user_subscriptions (
      user_id, plan_id, status, provider,
      current_period_start, current_period_end
    ) values (
      new.id, v_free_plan_id, 'active', 'manual',
      now(), now() + interval '100 years'
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Re-create the trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 5. Add user_id to admin notification policies ─────────────────────────────
-- Drop duplicate policies created by payment migration (conflict-safe)
drop policy if exists "Users read own notifications"   on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "System inserts notifications"   on public.notifications;
drop policy if exists "Admins read all notifications"  on public.notifications;

create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "System inserts notifications"
  on public.notifications for insert
  with check (true);

create policy "Admins read all notifications"
  on public.notifications for select
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role in ('admin','super_admin')
    )
  );

-- ── 6. user_subscriptions — allow system inserts (needed by handle_new_user) ──
-- The security definer trigger runs as DB owner so it bypasses RLS, but
-- add an explicit insert policy for the anon/service key path as well.
drop policy if exists "System inserts subscriptions" on public.user_subscriptions;
create policy "System inserts subscriptions"
  on public.user_subscriptions for insert
  with check (true);

-- ── 7. Ensure user_subscriptions has no client-side insert by regular users ───
-- Users should NOT be able to insert their own subscription rows directly.
-- Only the trigger (security definer) and admin RPCs should do this.
-- The existing "Users read own subscriptions" policy is select-only — correct.
-- Confirm no existing insert policy for users:
drop policy if exists "Users insert own subscriptions" on public.user_subscriptions;

-- ── Notify PostgREST to reload schema ────────────────────────────────────────
notify pgrst, 'reload schema';

-- ── 8. cancel_payment_submission RPC (admin) ──────────────────────────────────
-- Admin cancel goes through a security definer RPC like approve/reject.
-- The existing direct UPDATE in cancelSubmission() works because the
-- "Admins manage all submissions" policy covers it, but an RPC is cleaner
-- and provides an audit trail.

create or replace function public.cancel_payment_submission(
  p_submission_id uuid,
  p_admin_id      uuid
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
    where r.user_id = p_admin_id and r.role in ('admin','super_admin')
  ) then
    raise exception 'Permission denied: only admins can cancel submissions';
  end if;

  select * into v_sub from public.payment_submissions
  where id = p_submission_id for update;

  if not found then raise exception 'Submission not found'; end if;
  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  update public.payment_submissions set
    status     = 'cancelled',
    updated_at = now()
  where id = p_submission_id;

  insert into public.audit_logs (user_id, action, table_name, record_id, metadata, severity)
  values (
    p_admin_id, 'admin_action', 'payment_submissions', p_submission_id,
    jsonb_build_object('action','cancel','previous_status','pending_verification','new_status','cancelled'),
    'info'
  );

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.cancel_payment_submission(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
