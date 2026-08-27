-- ============================================================
--  Migration: 7-Day Pro Trial on Registration
--  Every new user automatically gets a 7-day Pro trial when
--  they sign up. No payment required. Trial expires automatically
--  via the existing expire_subscriptions() cron.
--
--  Design decisions:
--    - Uses status = 'trialing' (already handled by expiry + feature gates)
--    - Provider = 'trial' (distinguishable from manual/wallet)
--    - Points to the 'pro' tier plan (highest value trial makes sense)
--    - Falls back to any active paid plan if Pro doesn't exist
--    - Idempotent: won't double-grant if the trigger fires twice
--    - Does NOT grant a trial if user already has any subscription
--    - Existing handle_new_user() trigger is extended (not replaced)
-- ============================================================

-- ── 1. Helper: grant_trial_subscription ──────────────────────────────────────
--
-- Inserts a 7-day trialing subscription for a given user.
-- Called from handle_new_user() trigger.
-- Safe to call multiple times — ON CONFLICT DO NOTHING guards it.

CREATE OR REPLACE FUNCTION public.grant_trial_subscription(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id  uuid;
  v_plan_name text;
BEGIN
  -- Skip if user already has any subscription (prevents double-grant on re-triggers)
  IF EXISTS (
    SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id
  ) THEN
    RETURN;
  END IF;

  -- Find the Pro plan (tier = 'pro') — preferred for trial
  SELECT id, name INTO v_plan_id, v_plan_name
  FROM public.subscription_plans
  WHERE tier = 'pro' AND is_active = true
  ORDER BY price_monthly_usd ASC
  LIMIT 1;

  -- Fallback: any active non-free paid plan
  IF v_plan_id IS NULL THEN
    SELECT id, name INTO v_plan_id, v_plan_name
    FROM public.subscription_plans
    WHERE tier != 'free' AND is_active = true
    ORDER BY price_monthly_usd ASC
    LIMIT 1;
  END IF;

  -- If no paid plan exists yet (fresh DB), skip silently
  IF v_plan_id IS NULL THEN
    RETURN;
  END IF;

  -- Insert 7-day trial
  INSERT INTO public.user_subscriptions (
    user_id,
    plan_id,
    status,
    provider,
    current_period_start,
    current_period_end,
    metadata
  ) VALUES (
    p_user_id,
    v_plan_id,
    'trialing',
    'trial',
    now(),
    now() + INTERVAL '7 days',
    jsonb_build_object(
      'trial_reason', 'signup_bonus',
      'plan_name',    v_plan_name,
      'granted_at',   now()
    )
  )
  ON CONFLICT DO NOTHING;  -- safe if called twice

  -- Subscription event
  BEGIN
    INSERT INTO public.subscription_events (
      subscription_id, user_id, event_type, triggered_by, metadata
    )
    SELECT id, p_user_id, 'trial_started', 'system',
      jsonb_build_object('plan_name', v_plan_name, 'trial_days', 7)
    FROM public.user_subscriptions
    WHERE user_id = p_user_id AND status = 'trialing'
    ORDER BY created_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Welcome notification
  BEGIN
    INSERT INTO public.notifications (
      user_id, type, title, body, data, is_read
    ) VALUES (
      p_user_id,
      'trial_started',
      'Your 7-Day Pro Trial Has Started!',
      'Welcome to FitTrack Pro! Enjoy full access to AI coaching, meal planning, and all Pro features for 7 days — completely free.',
      jsonb_build_object(
        'plan_name',  v_plan_name,
        'trial_days', 7,
        'expires_at', now() + INTERVAL '7 days'
      ),
      false
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

END;
$$;

COMMENT ON FUNCTION public.grant_trial_subscription(uuid) IS
  'Grants a 7-day Pro trial to a new user. Idempotent — skips if user already has any subscription.';

GRANT EXECUTE ON FUNCTION public.grant_trial_subscription(uuid) TO service_role;

-- ── 2. Extend handle_new_user() trigger to also grant the trial ──────────────
--
-- We replace the existing function, keeping the original profile insert
-- and adding the trial grant at the end. The trigger itself stays the same.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile (original behaviour — unchanged)
  INSERT INTO public.users (id, name, registration_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;

  -- Grant 7-day Pro trial (new behaviour)
  -- Best-effort: if anything fails here, signup still succeeds
  BEGIN
    PERFORM public.grant_trial_subscription(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't block signup
    RAISE WARNING '[handle_new_user] trial grant failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Ensure trigger is still in place (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 3. Backfill: grant trial to existing users who have no subscription ───────
--
-- Users who registered before this migration get a trial too —
-- but only if they currently have no subscription at all.
-- Wraps in a BEGIN/EXCEPTION so a partial failure doesn't roll back the migration.

DO $$
DECLARE
  v_uid  uuid;
  v_count int := 0;
BEGIN
  FOR v_uid IN
    SELECT u.id
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_subscriptions s WHERE s.user_id = u.id
    )
  LOOP
    BEGIN
      PERFORM public.grant_trial_subscription(v_uid);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip this user, continue
      NULL;
    END;
  END LOOP;
  RAISE NOTICE 'Trial backfill: granted trial to % existing users', v_count;
END;
$$;

-- ── 4. Ensure expiry warning fires for 'trialing' status too ─────────────────
--
-- The notify_expiring_subscriptions() function already includes 'trialing' in
-- its WHERE clause (status in ('active','trialing')) so no change needed there.
--
-- Verify the expiry cron also covers 'trialing' — it does:
-- expire_subscriptions() WHERE status in ('active','trialing','paused')
-- So both functions are already correct.

-- ── 5. Trial-specific expiry notification ────────────────────────────────────
--
-- Override the generic expiry message for trial users with a more personal one.
-- We patch expire_subscriptions() to detect provider = 'trial' and use a
-- different notification title/body.

CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_rec   record;
  v_title text;
  v_body  text;
BEGIN
  FOR v_rec IN
    SELECT
      us.id,
      us.user_id,
      us.provider,
      sp.name AS plan_name
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status IN ('active', 'trialing', 'paused')
      AND us.current_period_end IS NOT NULL
      AND us.current_period_end < now()
      -- Exclude the forever-free "100 years" subscription
      AND us.current_period_end < now() + INTERVAL '50 years'
  LOOP
    -- Mark expired
    UPDATE public.user_subscriptions
    SET status = 'expired', updated_at = now()
    WHERE id = v_rec.id;

    -- Subscription event
    BEGIN
      INSERT INTO public.subscription_events (
        subscription_id, user_id, event_type, triggered_by, metadata
      ) VALUES (
        v_rec.id, v_rec.user_id, 'expired', 'system',
        jsonb_build_object('plan_name', v_rec.plan_name, 'expired_at', now(), 'provider', v_rec.provider)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Audit log
    BEGIN
      INSERT INTO public.audit_logs (
        user_id, action, table_name, record_id, metadata, severity
      ) VALUES (
        v_rec.user_id, 'update', 'user_subscriptions', v_rec.id,
        jsonb_build_object(
          'action', 'auto_expire',
          'previous_status', 'active',
          'new_status', 'expired',
          'plan_name', v_rec.plan_name,
          'provider', v_rec.provider
        ),
        'info'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Tailored notification: trial vs paid
    IF v_rec.provider = 'trial' THEN
      v_title := 'Your Free Trial Has Ended';
      v_body  := 'Your 7-day Pro trial has expired. Subscribe now to keep AI coaching, meal planning, and all Pro features.';
    ELSE
      v_title := 'Your subscription has expired';
      v_body  := 'Your ' || v_rec.plan_name || ' plan has expired. Renew now to keep your premium features.';
    END IF;

    BEGIN
      INSERT INTO public.notifications (
        user_id, type, title, body, data, is_read
      ) VALUES (
        v_rec.user_id,
        'subscription_expired',
        v_title,
        v_body,
        jsonb_build_object('plan_name', v_rec.plan_name, 'provider', v_rec.provider),
        false
      )
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.expire_subscriptions() IS
  'Auto-expires subscriptions past their current_period_end. Handles trial vs paid expiry messages.';

GRANT EXECUTE ON FUNCTION public.expire_subscriptions() TO service_role;

-- ── 6. Trial-specific 2-day warning ──────────────────────────────────────────
--
-- patch notify_expiring_subscriptions() to also send a dedicated
-- "trial ending soon" message at 2 days (not just 7 days like paid).

CREATE OR REPLACE FUNCTION public.notify_expiring_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_rec   record;
  v_title text;
  v_body  text;
  v_type  text;
BEGIN
  FOR v_rec IN
    SELECT
      us.id,
      us.user_id,
      us.provider,
      sp.name AS plan_name,
      us.current_period_end,
      FLOOR(EXTRACT(EPOCH FROM (us.current_period_end - now())) / 86400) AS days_left
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.status IN ('active', 'trialing')
      AND us.current_period_end IS NOT NULL
      AND us.current_period_end > now()
      AND (
        -- Paid subscriptions: warn at 7 days
        (us.provider != 'trial' AND us.current_period_end <= now() + INTERVAL '7 days')
        OR
        -- Trial subscriptions: warn at 2 days (more urgent)
        (us.provider = 'trial'  AND us.current_period_end <= now() + INTERVAL '2 days')
      )
      -- Don't spam — no warning sent in last 6 days for paid, 1 day for trial
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = us.user_id
          AND n.type IN ('subscription_expiring', 'trial_expiring')
          AND n.created_at > now() - CASE
            WHEN us.provider = 'trial' THEN INTERVAL '1 day'
            ELSE INTERVAL '6 days'
          END
      )
  LOOP
    IF v_rec.provider = 'trial' THEN
      v_type  := 'trial_expiring';
      v_title := 'Your Free Trial Ends in ' || v_rec.days_left::int || ' Day(s)!';
      v_body  := 'Your 7-day Pro trial expires soon. Subscribe now to keep AI coaching and all Pro features after your trial ends.';
    ELSE
      v_type  := 'subscription_expiring';
      v_title := 'Your subscription expires soon';
      v_body  := 'Your ' || v_rec.plan_name || ' plan expires in ' || v_rec.days_left::int || ' day(s). Renew now to avoid losing access.';
    END IF;

    BEGIN
      INSERT INTO public.notifications (
        user_id, type, title, body, data, is_read
      ) VALUES (
        v_rec.user_id,
        v_type,
        v_title,
        v_body,
        jsonb_build_object(
          'plan_name', v_rec.plan_name,
          'days_left', v_rec.days_left,
          'expires_at', v_rec.current_period_end,
          'provider', v_rec.provider
        ),
        false
      );
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.notify_expiring_subscriptions() IS
  'Sends expiry warning: 7 days for paid plans, 2 days for trials.';

GRANT EXECUTE ON FUNCTION public.notify_expiring_subscriptions() TO service_role;

NOTIFY pgrst, 'reload schema';
