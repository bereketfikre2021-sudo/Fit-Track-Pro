-- ============================================================
--  Seed: Development Test Users  (ALL-IN-ONE, self-contained)
--
--  WARNING: FOR DEVELOPMENT ONLY — never run in production.
--
--  This script creates auth.users entries AND public profile
--  data in a single transaction. No manual steps needed.
--
--  After running, you can sign in with:
--    free_user@fittrack.dev     Dev@12345
--    pro_user@fittrack.dev      Dev@12345
--    elite_user@fittrack.dev    Dev@12345
--    trial_user@fittrack.dev    Dev@12345
--    admin@fittrack.dev         Dev@12345
--    superadmin@fittrack.dev    Dev@12345
-- ============================================================

do $$
declare
  free_id    uuid;
  pro_id     uuid;
  elite_id   uuid;
  trial_id   uuid;
  admin_id   uuid;
  sadmin_id  uuid;

  -- Plan IDs looked up by tier (not hardcoded)
  plan_free   uuid;
  plan_pro    uuid;
  plan_elite  uuid;
  plan_team   uuid;
begin

  -- ── 0. Resolve plan IDs by tier ──────────────────────────────────────────
  select id into plan_free  from public.subscription_plans where tier = 'free'  limit 1;
  select id into plan_pro   from public.subscription_plans where tier = 'pro'   limit 1;
  select id into plan_elite from public.subscription_plans where tier = 'elite' limit 1;
  select id into plan_team  from public.subscription_plans where tier = 'team'  limit 1;

  if plan_free is null then
    raise exception 'subscription_plans not seeded — run seed.sql first';
  end if;

  -- ── 1. Create / fetch auth.users via Supabase internal function ──────────
  -- supabase_auth_admin is available in SQL Editor with service_role

  -- free user
  select id into free_id from auth.users where email = 'free_user@fittrack.dev';
  if free_id is null then
    free_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      free_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'free_user@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Dawit Bekele"}',
      false, null
    );
  end if;

  -- pro user
  select id into pro_id from auth.users where email = 'pro_user@fittrack.dev';
  if pro_id is null then
    pro_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      pro_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'pro_user@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Sara Haile"}',
      false, null
    );
  end if;

  -- elite user
  select id into elite_id from auth.users where email = 'elite_user@fittrack.dev';
  if elite_id is null then
    elite_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      elite_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'elite_user@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Yonas Tesfaye"}',
      false, null
    );
  end if;

  -- trial user
  select id into trial_id from auth.users where email = 'trial_user@fittrack.dev';
  if trial_id is null then
    trial_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      trial_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'trial_user@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Meron Alemu"}',
      false, null
    );
  end if;

  -- admin user
  select id into admin_id from auth.users where email = 'admin@fittrack.dev';
  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'admin@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Bereket Admin"}',
      false, null
    );
  end if;

  -- super admin
  select id into sadmin_id from auth.users where email = 'superadmin@fittrack.dev';
  if sadmin_id is null then
    sadmin_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, recovery_sent_at
    ) values (
      sadmin_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'superadmin@fittrack.dev',
      crypt('Dev@12345', gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      false, null
    );
  end if;

  -- ── 2. Public user profiles ───────────────────────────────────────────────
  insert into public.users (id, name, gender, height_cm, current_weight_kg, target_weight_kg, fitness_goal, fitness_level, focus_area, equipment, workout_days, registration_date)
  values
    (free_id,   'Dawit Bekele',  'male',   175, 80.0, 75.0, 'fat',       'beginner',     'full-body', array['Gym'],                            array['Monday','Wednesday','Friday'],            '2024-01-15'),
    (pro_id,    'Sara Haile',    'female', 163, 62.0, 58.0, 'muscle',    'intermediate', 'upper',     array['Barbell','Dumbbell'],              array['Tuesday','Thursday','Saturday'],          '2024-02-01'),
    (elite_id,  'Yonas Tesfaye', 'male',   182, 90.0, 88.0, 'strength',  'advanced',     'full-body', array['Gym','Barbell','Dumbbell'],        array['Monday','Tuesday','Thursday','Friday'],   '2023-11-20'),
    (trial_id,  'Meron Alemu',   'female', 168, 70.0, 65.0, 'endurance', 'beginner',     'lower',     array['Bodyweight'],                     array['Monday','Wednesday','Friday','Sunday'],   '2024-06-01'),
    (admin_id,  'Bereket Admin', 'male',   178, 75.0, 73.0, 'muscle',    'intermediate', 'full-body', array['Gym'],                            array['Monday','Wednesday','Friday'],            '2023-06-15'),
    (sadmin_id, 'Super Admin',   'male',   180, 78.0, 76.0, 'strength',  'advanced',     'full-body', array['Gym','Barbell'],                  array['Monday','Tuesday','Thursday','Saturday'], '2023-01-01')
  on conflict (id) do nothing;

  -- ── 3. Roles ──────────────────────────────────────────────────────────────
  insert into public.user_roles (user_id, role) values
    (free_id,   'user'),
    (pro_id,    'user'),
    (elite_id,  'user'),
    (trial_id,  'user'),
    (admin_id,  'admin'),
    (sadmin_id, 'super_admin')
  on conflict (user_id, role) do nothing;

  -- ── 4. Subscriptions ─────────────────────────────────────────────────────
  insert into public.user_subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
  values
    (free_id,   plan_free,  'active',   'manual', now(), now() + interval '100 years'),
    (pro_id,    plan_pro,   'active',   'stripe', now(), now() + interval '1 month'),
    (elite_id,  plan_elite, 'active',   'stripe', now(), now() + interval '1 year'),
    (trial_id,  plan_pro,   'trialing', 'stripe', now(), now() + interval '14 days'),
    (admin_id,  plan_elite, 'active',   'manual', now(), now() + interval '100 years'),
    (sadmin_id, plan_team,  'active',   'manual', now(), now() + interval '100 years')
  on conflict do nothing;

  -- ── 5. Payments ───────────────────────────────────────────────────────────
  insert into public.payments (user_id, provider, amount_usd, status, description, created_at)
  values
    (pro_id,   'stripe', 4.99,  'succeeded', 'Pro Monthly Subscription',  now() - interval '1 month'),
    (pro_id,   'stripe', 4.99,  'succeeded', 'Pro Monthly Subscription',  now()),
    (elite_id, 'stripe', 99.99, 'succeeded', 'Elite Annual Subscription', now() - interval '2 months')
  on conflict do nothing;

  -- ── 6. AI usage logs ──────────────────────────────────────────────────────
  insert into public.ai_usage_logs (user_id, feature, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success)
  values
    (pro_id,   'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 450, 800,  1250, 1200, true),
    (pro_id,   'meal_recommendation',     'gemini', 'gemini-1.5-flash', 380, 950,  1330, 1450, true),
    (elite_id, 'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 520, 1100, 1620, 980,  true),
    (elite_id, 'meal_recommendation',     'gemini', 'gemini-1.5-flash', 410, 870,  1280, 1100, true),
    (elite_id, 'shopping_recommendation', 'gemini', 'gemini-1.5-flash', 390, 650,  1040, 890,  true),
    (free_id,  'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 300, 500,  800,  2100, false)
  on conflict do nothing;

  -- ── 7. Notifications ──────────────────────────────────────────────────────
  insert into public.notifications (user_id, title, body, channel, category, is_read)
  values
    (pro_id,   'Workout Reminder',     'Time for your Tuesday workout!',               'in_app', 'workout_reminder', false),
    (pro_id,   'New PR Unlocked!',     'You hit a new personal record on Bench Press!', 'in_app', 'achievement',      false),
    (elite_id, 'Weekly Summary Ready', 'Your week 24 workout summary is available.',    'in_app', 'system',           true),
    (free_id,  'Upgrade to Pro',       'Unlock AI recommendations and remove ads.',     'in_app', 'promo',            false),
    (trial_id, 'Trial Ending Soon',    'Your Pro trial expires in 3 days.',             'in_app', 'system',           false)
  on conflict do nothing;

  -- ── 8. Body logs ──────────────────────────────────────────────────────────
  insert into public.body_logs (user_id, log_date, weight_kg, notes)
  values
    (elite_id, current_date - 30, 92.0, 'Start of cut'),
    (elite_id, current_date - 20, 91.2, null),
    (elite_id, current_date - 10, 90.5, null),
    (elite_id, current_date,      90.0, 'Feeling good'),
    (pro_id,   current_date - 14, 63.5, null),
    (pro_id,   current_date - 7,  63.0, null),
    (pro_id,   current_date,      62.5, null)
  on conflict (user_id, log_date) do nothing;

  raise notice 'Dev users created successfully:';
  raise notice '  free_user@fittrack.dev    → %', free_id;
  raise notice '  pro_user@fittrack.dev     → %', pro_id;
  raise notice '  elite_user@fittrack.dev   → %', elite_id;
  raise notice '  trial_user@fittrack.dev   → %', trial_id;
  raise notice '  admin@fittrack.dev        → %', admin_id;
  raise notice '  superadmin@fittrack.dev   → %', sadmin_id;

end;
$$;
