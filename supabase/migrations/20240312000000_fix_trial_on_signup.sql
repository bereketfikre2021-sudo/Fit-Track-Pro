-- ============================================================
--  Migration: Fix 7-Day Pro Trial on Signup
--
--  Problem: migration 20240304 inserts a free subscription row
--  BEFORE the trial grant runs. grant_trial_subscription() sees
--  an existing subscription and skips the trial entirely.
--
--  Fix strategy:
--    1. Replace handle_new_user() to:
--         a. Insert user profile (unchanged)
--         b. Grant 7-day Pro trial directly (no free-sub pre-insert)
--       When the trial expires, useSubscription() returns FREE_FEATURES
--       automatically because no active/trialing row exists — so the
--       100-year free subscription row is unnecessary.
--
--    2. Replace grant_trial_subscription() to:
--         - Only skip if the user already has a PAID or TRIALING sub
--         - If they only have a free-tier sub, still grant the trial
--         - Delete the free-tier sub first so trial takes effect
--
--    3. Backfill: for users who got a free sub but no trial, grant the
--       trial now (if they registered within the last 30 days).
--
--  Safe to re-run — all statements are idempotent.
-- ============================================================

-- ── 1. Replace grant_trial_subscription ──────────────────────────────────────

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
  -- Skip ONLY if the user already has a PAID or TRIALING subscription.
  -- A free-tier row (tier='free') should NOT block the trial.
  IF EXISTS (
    SELECT 1
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('active', 'trialing')
      AND sp.tier != 'free'   -- ← KEY FIX: free tier does not block trial
  ) THEN
    RETURN;
  END IF;

  -- Find the Pro plan for the trial
  SELECT id, name INTO v_plan_id, v_plan_name
  FROM public.subscription_plans
  WHERE tier = 'pro' AND is_active = true
  ORDER BY price_monthly_usd ASC
  LIMIT 1;

  -- Fallback to any active non-free paid plan
  IF v_plan_id IS NULL THEN
    SELECT id, name INTO v_plan_id, v_plan_name
    FROM public.subscription_plans
    WHERE tier != 'free' AND is_active = true
    ORDER BY price_monthly_usd ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN
    RETURN; -- No paid plan exists yet — skip silently
  END IF;

  -- Remove any existing free-tier subscription so the trial is the only row
  DELETE FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND plan_id IN (
      SELECT id FROM public.subscription_plans WHERE tier = 'free'
    );

  -- Insert the 7-day trial
  INSERT INTO public.user_subscriptions (
    user_id, plan_id, status, provider,
    current_period_start, current_period_end,
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
  ON CONFLICT DO NOTHING;

  -- Subscription event (best-effort)
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

  -- Welcome notification (best-effort)
  BEGIN
    INSERT INTO public.notifications (
      user_id, type, title, body, data, is_read
    ) VALUES (
      p_user_id,
      'trial_started',
      'Your 7-Day Pro Trial Has Started! 🎉',
      'Welcome to FitTrack Pro! Enjoy full AI coaching, meal planning, and all Pro features free for 7 days.',
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
  'Grants a 7-day Pro trial. Skips only if user already has a PAID/TRIALING sub. Free-tier subs are removed first.';

GRANT EXECUTE ON FUNCTION public.grant_trial_subscription(uuid) TO service_role;

-- ── 2. Replace handle_new_user — no longer pre-creates a free subscription ────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create user profile row
  INSERT INTO public.users (id, name, registration_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    CURRENT_DATE
  )
  ON CONFLICT (id) DO NOTHING;

  -- Grant 7-day Pro trial (best-effort — never blocks signup)
  BEGIN
    PERFORM public.grant_trial_subscription(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] trial grant failed for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 3. Backfill: users registered in the last 30 days who only have free sub ──
DO $$
DECLARE
  v_uid   uuid;
  v_count int := 0;
BEGIN
  FOR v_uid IN
    SELECT u.id
    FROM public.users u
    WHERE u.registration_date >= CURRENT_DATE - INTERVAL '30 days'
      -- Has a free-tier subscription but no trial or paid sub
      AND EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        JOIN public.subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = u.id AND sp.tier = 'free'
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions us
        JOIN public.subscription_plans sp ON sp.id = us.plan_id
        WHERE us.user_id = u.id
          AND us.status IN ('active','trialing')
          AND sp.tier != 'free'
      )
  LOOP
    BEGIN
      PERFORM public.grant_trial_subscription(v_uid);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  RAISE NOTICE 'Trial backfill (last 30 days): granted trial to % users', v_count;
END;
$$;

NOTIFY pgrst, 'reload schema';
