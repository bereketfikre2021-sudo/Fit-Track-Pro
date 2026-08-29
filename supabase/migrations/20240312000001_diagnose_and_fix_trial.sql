-- ============================================================
--  DIAGNOSTIC + DIRECT FIX for the trial issue
--  Run this in Supabase SQL Editor
--  It will show you exactly what's in the DB then fix it.
-- ============================================================

-- ── STEP 1: See what subscription rows exist for ALL users ───────────────────
SELECT
  u.id            AS user_id,
  u.name          AS user_name,
  u.registration_date,
  us.id           AS sub_id,
  us.status       AS sub_status,
  us.provider,
  us.current_period_end,
  sp.tier         AS plan_tier,
  sp.name         AS plan_name
FROM public.users u
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
ORDER BY u.registration_date DESC
LIMIT 30;

-- ── STEP 2: Check if Pro plan exists ─────────────────────────────────────────
SELECT id, name, tier, is_active
FROM public.subscription_plans
ORDER BY price_monthly_usd ASC;

-- ── STEP 3: Direct fix — grant trial to ALL users who have no active paid/trial sub ──
-- This bypasses grant_trial_subscription() entirely and inserts directly.
DO $$
DECLARE
  v_uid         uuid;
  v_plan_id     uuid;
  v_plan_name   text;
  v_count       int := 0;
BEGIN
  -- Get Pro plan id
  SELECT id, name INTO v_plan_id, v_plan_name
  FROM public.subscription_plans
  WHERE tier = 'pro' AND is_active = true
  ORDER BY price_monthly_usd ASC
  LIMIT 1;

  -- Fallback to any paid plan
  IF v_plan_id IS NULL THEN
    SELECT id, name INTO v_plan_id, v_plan_name
    FROM public.subscription_plans
    WHERE tier != 'free' AND is_active = true
    ORDER BY price_monthly_usd ASC
    LIMIT 1;
  END IF;

  IF v_plan_id IS NULL THEN
    RAISE NOTICE 'NO PAID PLAN FOUND — cannot grant trial. Create a Pro plan first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using plan: % (id: %)', v_plan_name, v_plan_id;

  FOR v_uid IN
    SELECT u.id
    FROM public.users u
    WHERE
      -- No active/trialing paid sub exists
      NOT EXISTS (
        SELECT 1
        FROM public.user_subscriptions us2
        JOIN public.subscription_plans sp2 ON sp2.id = us2.plan_id
        WHERE us2.user_id = u.id
          AND us2.status IN ('active','trialing')
          AND sp2.tier != 'free'
      )
  LOOP
    -- Remove any free-tier sub rows so there is no conflict
    DELETE FROM public.user_subscriptions
    WHERE user_id = v_uid
      AND plan_id IN (
        SELECT id FROM public.subscription_plans WHERE tier = 'free'
      );

    -- Insert 7-day trial directly (ON CONFLICT DO NOTHING is safe)
    INSERT INTO public.user_subscriptions (
      user_id, plan_id, status, provider,
      current_period_start, current_period_end,
      metadata
    ) VALUES (
      v_uid,
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

    -- Notify user
    BEGIN
      INSERT INTO public.notifications (user_id, type, title, body, data, is_read)
      VALUES (
        v_uid,
        'trial_started',
        'Your 7-Day Pro Trial Has Started! 🎉',
        'You now have full access to AI coaching, meal planning, and all Pro features for 7 days — free.',
        jsonb_build_object('plan_name', v_plan_name, 'trial_days', 7),
        false
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Granted trial to % user(s)', v_count;
END;
$$;

-- ── STEP 4: Verify — show final subscription state ───────────────────────────
SELECT
  u.name,
  u.registration_date,
  us.status,
  us.provider,
  sp.tier,
  us.current_period_end
FROM public.users u
LEFT JOIN public.user_subscriptions us ON us.user_id = u.id
LEFT JOIN public.subscription_plans sp ON sp.id = us.plan_id
WHERE us.status IN ('trialing','active')
ORDER BY u.registration_date DESC
LIMIT 20;
