-- ============================================================
--  Migration: Manual Payment Verification System
--  Phase 13 — FitTrack Pro
--
--  Adds:
--    1. app_payment_methods     — configurable CBE / Awash / Telebirr
--    2. payment_submissions     — user proof submissions
--    3. payment_proof bucket    — private Supabase Storage
--    4. approve_payment_submission() RPC — atomic approval
--    5. reject_payment_submission()  RPC — atomic rejection
--    6. RLS policies for all new tables
-- ============================================================

-- ── 1. app_payment_methods ────────────────────────────────────────────────────
-- Stores configurable payment account details shown to users.
-- Managed by admin, read publicly so frontend can display them.

create table if not exists public.app_payment_methods (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,                    -- 'Commercial Bank of Ethiopia'
  type           text        not null                     -- 'bank' | 'mobile_money'
                   check (type in ('bank', 'mobile_money', 'other')),
  account_name   text,
  account_number text,
  phone_number   text,
  instructions   text,
  logo_url       text,
  is_active      boolean     not null default true,
  display_order  integer     not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.app_payment_methods is
  'Admin-configurable payment methods (CBE, Awash, Telebirr) shown to users.';

create index idx_app_payment_methods_active on public.app_payment_methods(is_active, display_order);

drop trigger if exists trg_app_payment_methods_updated_at on public.app_payment_methods;
create trigger trg_app_payment_methods_updated_at
  before update on public.app_payment_methods
  for each row execute procedure public.set_updated_at();

-- RLS: anyone can read active methods; only admins can write
alter table public.app_payment_methods enable row level security;

create policy "Public read active payment methods"
  on public.app_payment_methods for select
  using (true);

create policy "Admins manage payment methods"
  on public.app_payment_methods for all
  using (auth.uid() is not null and exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin','super_admin')
  ))
  with check (auth.uid() is not null and exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin','super_admin')
  ));

-- Seed initial payment methods
insert into public.app_payment_methods (name, type, account_name, account_number, phone_number, instructions, is_active, display_order)
values
  ('Commercial Bank of Ethiopia', 'bank',         '', '', '', 'Transfer to the account number above and note your name.', true, 1),
  ('Awash Bank',                  'bank',         '', '', '', 'Transfer to the account number above and note your name.', true, 2),
  ('Telebirr',                    'mobile_money', '', '', '', 'Send to the phone number above and note your name.',        true, 3)
on conflict do nothing;

-- ── 2. payment_submissions ────────────────────────────────────────────────────
-- One row per user payment proof submission.
-- Status lifecycle: pending_verification → approved | rejected | cancelled

create type public.payment_submission_status as enum (
  'pending_verification',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);

create table if not exists public.payment_submissions (
  id                    uuid        primary key default gen_random_uuid(),

  -- Who is paying
  user_id               uuid        not null references auth.users(id) on delete cascade,

  -- What they're paying for
  plan_id               uuid        not null references public.subscription_plans(id),

  -- How they paid
  payment_method_id     uuid        not null references public.app_payment_methods(id),
  amount_etb            numeric(12,2) not null check (amount_etb > 0),
  currency              char(3)     not null default 'ETB',

  -- Proof details (filled by user)
  transaction_ref       text        not null,  -- transaction/reference number from bank
  payment_date          date        not null,
  proof_path            text,                  -- Storage path: {user_id}/{submission_id}/proof.ext
  proof_url             text,                  -- Signed URL (not public)
  note                  text,
  submitted_at          timestamptz not null default now(),

  -- Verification (filled by admin)
  status                public.payment_submission_status not null default 'pending_verification',
  verified_by           uuid        references auth.users(id) on delete set null,
  verified_at           timestamptz,
  verification_note     text,
  rejection_reason      text,  -- from predefined list
  rejection_reason_custom text,

  -- Link to activated subscription (set on approval)
  subscription_id       uuid        references public.user_subscriptions(id) on delete set null,

  -- Duplicate detection hint (set by system)
  is_duplicate_suspect  boolean     not null default false,
  duplicate_of          uuid        references public.payment_submissions(id) on delete set null,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.payment_submissions is
  'User payment proof submissions awaiting admin verification.';

create index idx_payment_submissions_user_id     on public.payment_submissions(user_id);
create index idx_payment_submissions_status      on public.payment_submissions(status);
create index idx_payment_submissions_submitted_at on public.payment_submissions(submitted_at desc);
create index idx_payment_submissions_method      on public.payment_submissions(payment_method_id);
create index idx_payment_submissions_plan        on public.payment_submissions(plan_id);
create index idx_payment_submissions_txref       on public.payment_submissions(transaction_ref);

drop trigger if exists trg_payment_submissions_updated_at on public.payment_submissions;
create trigger trg_payment_submissions_updated_at
  before update on public.payment_submissions
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.payment_submissions enable row level security;

-- Users: read own submissions only
create policy "Users read own submissions"
  on public.payment_submissions for select
  using (auth.uid() = user_id);

-- Users: insert their own (status locked to pending_verification at DB level)
create policy "Users insert own submissions"
  on public.payment_submissions for insert
  with check (
    auth.uid() = user_id
    and status = 'pending_verification'
  );

-- Users: can only cancel their own PENDING submission
create policy "Users cancel own pending submission"
  on public.payment_submissions for update
  using (
    auth.uid() = user_id
    and status = 'pending_verification'
  )
  with check (
    auth.uid() = user_id
    and status = 'cancelled'
    -- prevent users from touching verification fields
    and verified_by is null
    and verified_at is null
  );

-- Admins: full access
create policy "Admins manage all submissions"
  on public.payment_submissions for all
  using (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin','super_admin')
  ))
  with check (exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role in ('admin','super_admin')
  ));

-- ── 3. Duplicate detection trigger ───────────────────────────────────────────
create or replace function public.check_payment_submission_duplicate()
returns trigger language plpgsql as $$
declare
  existing_id uuid;
begin
  select id into existing_id
  from public.payment_submissions
  where user_id          = new.user_id
    and transaction_ref  = new.transaction_ref
    and payment_method_id = new.payment_method_id
    and status not in ('cancelled','rejected')
    and id != new.id
  limit 1;

  if existing_id is not null then
    new.is_duplicate_suspect := true;
    new.duplicate_of := existing_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_submission_duplicate on public.payment_submissions;
create trigger trg_payment_submission_duplicate
  before insert on public.payment_submissions
  for each row execute procedure public.check_payment_submission_duplicate();

-- ── 4. Atomic approval RPC ────────────────────────────────────────────────────
create or replace function public.approve_payment_submission(
  p_submission_id   uuid,
  p_admin_id        uuid,
  p_note            text default null
)
returns jsonb
language plpgsql
security definer   -- runs with full DB access; caller must be admin (checked inside)
as $$
declare
  v_sub           record;
  v_plan          record;
  v_new_sub_id    uuid;
  v_period_end    timestamptz;
  v_existing_sub  uuid;
begin
  -- ── Security: caller must be admin ───────────────────────────────────────
  if not exists (
    select 1 from public.user_roles r
    where r.user_id = p_admin_id and r.role in ('admin','super_admin')
  ) then
    raise exception 'Permission denied: only admins can approve payments';
  end if;

  -- ── Load submission ───────────────────────────────────────────────────────
  select * into v_sub
  from public.payment_submissions
  where id = p_submission_id
  for update;  -- lock row

  if not found then
    raise exception 'Submission not found: %', p_submission_id;
  end if;

  if v_sub.status != 'pending_verification' then
    raise exception 'Submission is already %', v_sub.status;
  end if;

  -- ── Load plan ─────────────────────────────────────────────────────────────
  select * into v_plan from public.subscription_plans where id = v_sub.plan_id;
  if not found then raise exception 'Plan not found'; end if;

  -- Calculate period end (30 days for monthly)
  v_period_end := now() + interval '30 days';

  -- ── Mark submission APPROVED ──────────────────────────────────────────────
  update public.payment_submissions set
    status            = 'approved',
    verified_by       = p_admin_id,
    verified_at       = now(),
    verification_note = p_note,
    updated_at        = now()
  where id = p_submission_id;

  -- ── Cancel any existing active subscription for this user ─────────────────
  update public.user_subscriptions set
    status       = 'cancelled',
    cancelled_at = now(),
    updated_at   = now()
  where user_id = v_sub.user_id
    and status in ('active','trialing','paused')
  returning id into v_existing_sub;

  -- ── Create new subscription ───────────────────────────────────────────────
  insert into public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end, metadata
  ) values (
    v_sub.user_id, v_sub.plan_id, 'active', 'manual',
    now(), v_period_end,
    jsonb_build_object('payment_submission_id', p_submission_id, 'approved_by', p_admin_id)
  )
  returning id into v_new_sub_id;

  -- ── Link subscription to submission ──────────────────────────────────────
  update public.payment_submissions
  set subscription_id = v_new_sub_id
  where id = p_submission_id;

  -- ── Create payment record ─────────────────────────────────────────────────
  insert into public.payments (
    user_id, subscription_id, provider, provider_payment_id,
    amount_usd, currency, status, description
  ) values (
    v_sub.user_id, v_new_sub_id, 'manual', v_sub.transaction_ref,
    v_sub.amount_etb, v_sub.currency, 'succeeded',
    'Manual payment verified by admin. Ref: ' || v_sub.transaction_ref
  );

  -- ── Subscription event ────────────────────────────────────────────────────
  insert into public.subscription_events (
    subscription_id, user_id, event_type, new_plan_id,
    old_plan_id, triggered_by, metadata
  ) values (
    v_new_sub_id, v_sub.user_id, 'approved_manual_payment', v_sub.plan_id,
    null, 'admin',
    jsonb_build_object('submission_id', p_submission_id, 'admin_id', p_admin_id, 'note', p_note)
  );

  -- ── Audit log ─────────────────────────────────────────────────────────────
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

  -- ── In-app notification ───────────────────────────────────────────────────
  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'payment_approved',
    'Payment Approved!',
    'Your ' || v_plan.name || ' subscription has been activated. Enjoy FitTrack Pro!',
    jsonb_build_object('submission_id', p_submission_id, 'plan', v_plan.name)
  )
  on conflict do nothing;

  return jsonb_build_object(
    'success', true,
    'subscription_id', v_new_sub_id,
    'period_end', v_period_end
  );
end;
$$;

grant execute on function public.approve_payment_submission(uuid, uuid, text) to authenticated;

-- ── 5. Atomic rejection RPC ───────────────────────────────────────────────────
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
    status                 = 'rejected',
    verified_by            = p_admin_id,
    verified_at            = now(),
    rejection_reason       = p_rejection_reason,
    rejection_reason_custom = p_custom_note,
    updated_at             = now()
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

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_sub.user_id,
    'payment_rejected',
    'Payment Verification Unsuccessful',
    'Your payment submission was not approved. Reason: ' || p_rejection_reason || '. You can submit a new proof.',
    jsonb_build_object('submission_id', p_submission_id, 'reason', p_rejection_reason)
  )
  on conflict do nothing;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.reject_payment_submission(uuid, uuid, text, text) to authenticated;

-- ── 6. Notifications table (create if not exists) ─────────────────────────────
create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  type       text        not null,
  title      text        not null,
  body       text        not null,
  data       jsonb       default '{}',
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users read own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
create policy "System inserts notifications"
  on public.notifications for insert with check (true);
create policy "Admins read all notifications"
  on public.notifications for select using (exists (
    select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')
  ));

-- ── 7. payment-proofs storage bucket (private) ───────────────────────────────
-- Run this separately in SQL Editor if bucket doesn't exist:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,   -- PRIVATE bucket
  5242880, -- 5 MB
  array['image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: users can only upload to their own folder
drop policy if exists "Users upload own payment proofs"  on storage.objects;
drop policy if exists "Users read own payment proofs"    on storage.objects;
drop policy if exists "Admins read all payment proofs"   on storage.objects;
drop policy if exists "Users delete own payment proofs"  on storage.objects;

create policy "Users upload own payment proofs"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own payment proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins read all payment proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and auth.uid() is not null
    and exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role in ('admin','super_admin')
    )
  );

create policy "Users delete own payment proofs"
  on storage.objects for delete
  using (
    bucket_id = 'payment-proofs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Grants ────────────────────────────────────────────────────────────────────
grant select on public.app_payment_methods to anon, authenticated;
grant all    on public.payment_submissions  to authenticated;
grant select on public.notifications        to authenticated;
grant all    on public.notifications        to authenticated;
