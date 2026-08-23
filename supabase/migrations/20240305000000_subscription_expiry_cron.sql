-- ============================================================
--  Migration: Subscription expiry automation
--  Phase 15 — Critical Fix #2
--
--  1. expire_subscriptions() — marks subscriptions as expired
--     when current_period_end has passed and status is active/trialing/paused
--  2. pg_cron schedule — runs expire_subscriptions() every hour
--     (pg_cron must be enabled: Dashboard → Database → Extensions → pg_cron)
--  3. Notifies users on expiry
-- ============================================================

-- ── 1. Expiry function ────────────────────────────────────────────────────────
create or replace function public.expire_subscriptions()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_rec   record;
begin
  -- Find all subscriptions that are past their period end and still "live"
  for v_rec in
    select us.id, us.user_id, sp.name as plan_name
    from public.user_subscriptions us
    join public.subscription_plans sp on sp.id = us.plan_id
    where us.status in ('active', 'trialing', 'paused')
      and us.current_period_end is not null
      and us.current_period_end < now()
      -- exclude the forever-free "100 years" subscription
      and us.current_period_end < now() + interval '50 years'
  loop
    -- Mark expired
    update public.user_subscriptions
    set status     = 'expired',
        updated_at = now()
    where id = v_rec.id;

    -- Subscription event
    insert into public.subscription_events (
      subscription_id, user_id, event_type, triggered_by, metadata
    ) values (
      v_rec.id, v_rec.user_id, 'expired', 'system',
      jsonb_build_object('plan_name', v_rec.plan_name, 'expired_at', now())
    );

    -- Audit log
    insert into public.audit_logs (
      user_id, action, table_name, record_id, metadata, severity
    ) values (
      v_rec.user_id, 'update', 'user_subscriptions', v_rec.id,
      jsonb_build_object(
        'action', 'auto_expire',
        'previous_status', 'active',
        'new_status', 'expired',
        'plan_name', v_rec.plan_name
      ),
      'info'
    );

    -- In-app notification to user
    insert into public.notifications (
      user_id, type, title, body, data, is_read
    ) values (
      v_rec.user_id,
      'subscription_expired',
      'Your subscription has expired',
      'Your ' || v_rec.plan_name || ' plan has expired. Renew now to keep your premium features.',
      jsonb_build_object('plan_name', v_rec.plan_name),
      false
    )
    on conflict do nothing;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.expire_subscriptions() is
  'Auto-expires subscriptions past their current_period_end. Called by pg_cron hourly.';

grant execute on function public.expire_subscriptions() to service_role;

-- ── 2. pg_cron schedule (hourly) ─────────────────────────────────────────────
-- Requires pg_cron extension. Enable it first:
--   Dashboard → Database → Extensions → pg_cron → Enable
--
-- If pg_cron is already enabled this will create/replace the job.
-- If it is NOT enabled yet, run this block manually after enabling it.

do $$
begin
  -- Only schedule if pg_cron is available
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    -- Remove existing job if any
    perform cron.unschedule('expire-subscriptions')
    where exists (select 1 from cron.job where jobname = 'expire-subscriptions');

    -- Schedule new job — runs at the top of every hour
    perform cron.schedule(
      'expire-subscriptions',
      '0 * * * *',   -- every hour at :00
      $$select public.expire_subscriptions();$$
    );
  end if;
end;
$$;

-- ── 3. Expiry warning function (7-day advance notice) ─────────────────────────
-- Sends a notification to users whose subscription expires within 7 days.
-- Schedule separately: '0 9 * * *' (daily at 9 AM UTC)

create or replace function public.notify_expiring_subscriptions()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  v_rec   record;
begin
  for v_rec in
    select us.id, us.user_id, sp.name as plan_name,
           us.current_period_end,
           floor(extract(epoch from (us.current_period_end - now())) / 86400) as days_left
    from public.user_subscriptions us
    join public.subscription_plans sp on sp.id = us.plan_id
    where us.status in ('active', 'trialing')
      and us.current_period_end is not null
      and us.current_period_end > now()
      and us.current_period_end <= now() + interval '7 days'
      -- Don't spam — check no expiry warning sent in last 6 days
      and not exists (
        select 1 from public.notifications n
        where n.user_id = us.user_id
          and n.type = 'subscription_expiring'
          and n.created_at > now() - interval '6 days'
      )
  loop
    insert into public.notifications (
      user_id, type, title, body, data, is_read
    ) values (
      v_rec.user_id,
      'subscription_expiring',
      'Your subscription expires soon',
      'Your ' || v_rec.plan_name || ' plan expires in ' || v_rec.days_left::int || ' day(s). Renew now to avoid losing access.',
      jsonb_build_object('plan_name', v_rec.plan_name, 'days_left', v_rec.days_left, 'expires_at', v_rec.current_period_end),
      false
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

comment on function public.notify_expiring_subscriptions() is
  'Sends expiry warning notifications 7 days before subscription ends. Run daily.';

grant execute on function public.notify_expiring_subscriptions() to service_role;

-- Schedule daily expiry warning at 9:00 AM UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('notify-expiring-subscriptions')
    where exists (select 1 from cron.job where jobname = 'notify-expiring-subscriptions');

    perform cron.schedule(
      'notify-expiring-subscriptions',
      '0 9 * * *',
      $$select public.notify_expiring_subscriptions();$$
    );
  end if;
end;
$$;

-- ── 4. Run immediately to catch any already-expired subscriptions ─────────────
select public.expire_subscriptions();

notify pgrst, 'reload schema';

-- ── 5. progress_photos storage bucket ────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress_photos',
  'progress_photos',
  false,
  10485760,  -- 10 MB
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own progress photos"  on storage.objects;
drop policy if exists "Users read own progress photos"    on storage.objects;
drop policy if exists "Users delete own progress photos"  on storage.objects;

create policy "Users upload own progress photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users read own progress photos"
  on storage.objects for select
  using (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users delete own progress photos"
  on storage.objects for delete
  using (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

notify pgrst, 'reload schema';
