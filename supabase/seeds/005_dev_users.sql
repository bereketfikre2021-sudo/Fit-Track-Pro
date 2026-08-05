-- ============================================================
--  Seed: Development Test Users
--
--  WARNING: FOR DEVELOPMENT ONLY — never run in production.
--
--  These are fake user IDs that reference auth.users.
--  In a real Supabase project you must first create these users
--  via the Supabase Auth dashboard or API, then run this seed
--  using the actual UUIDs assigned by Supabase Auth.
--
--  Placeholder UUIDs below — replace with real auth.users IDs
--  before running.
--
--  Test accounts (create in Supabase Auth Dashboard first):
--    free_user@fittrack.dev        password: Dev@12345
--    pro_user@fittrack.dev         password: Dev@12345
--    elite_user@fittrack.dev       password: Dev@12345
--    trial_user@fittrack.dev       password: Dev@12345
--    admin_user@fittrack.dev       password: Dev@12345
--    super_admin@fittrack.dev      password: Dev@12345
-- ============================================================

-- ── Step 1: Insert into public.users (profile table) ─────────────────────────
-- Replace the UUIDs below with real auth.users IDs after creating accounts.

do $$
declare
  free_id    uuid := 'b0000001-0000-0000-0000-000000000001';
  pro_id     uuid := 'b0000001-0000-0000-0000-000000000002';
  elite_id   uuid := 'b0000001-0000-0000-0000-000000000003';
  trial_id   uuid := 'b0000001-0000-0000-0000-000000000004';
  admin_id   uuid := 'b0000001-0000-0000-0000-000000000005';
  sadmin_id  uuid := 'b0000001-0000-0000-0000-000000000006';
begin
  -- Profiles
  insert into public.users (id, name, gender, height_cm, current_weight_kg, target_weight_kg, fitness_goal, fitness_level, focus_area, equipment, workout_days, registration_date)
  values
    (free_id,   'Dawit Bekele',     'male',   175, 80.0, 75.0, 'fat',       'beginner',     'full-body', array['Gym'],                            array['Monday','Wednesday','Friday'],            '2024-01-15'),
    (pro_id,    'Sara Haile',       'female', 163, 62.0, 58.0, 'muscle',    'intermediate', 'upper',     array['Barbell','Dumbbell'],              array['Tuesday','Thursday','Saturday'],          '2024-02-01'),
    (elite_id,  'Yonas Tesfaye',    'male',   182, 90.0, 88.0, 'strength',  'advanced',     'full-body', array['Gym','Barbell','Dumbbell'],        array['Monday','Tuesday','Thursday','Friday'],   '2023-11-20'),
    (trial_id,  'Meron Alemu',      'female', 168, 70.0, 65.0, 'endurance', 'beginner',     'lower',     array['Bodyweight'],                     array['Monday','Wednesday','Friday','Sunday'],   '2024-06-01'),
    (admin_id,  'Bereket Admin',    'male',   178, 75.0, 73.0, 'muscle',    'intermediate', 'full-body', array['Gym'],                            array['Monday','Wednesday','Friday'],            '2023-06-15'),
    (sadmin_id, 'Super Admin',      'male',   180, 78.0, 76.0, 'strength',  'advanced',     'full-body', array['Gym','Barbell'],                  array['Monday','Tuesday','Thursday','Saturday'], '2023-01-01')
  on conflict (id) do nothing;

  -- Roles
  insert into public.user_roles (user_id, role) values
    (free_id,   'user'),
    (pro_id,    'user'),
    (elite_id,  'user'),
    (trial_id,  'user'),
    (admin_id,  'admin'),
    (sadmin_id, 'super_admin')
  on conflict (user_id, role) do nothing;

  -- Subscriptions
  insert into public.user_subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
  values
    (free_id,  'a1000000-0000-0000-0000-000000000001', 'active',   'manual', now(), now() + interval '100 years'),
    (pro_id,   'a1000000-0000-0000-0000-000000000002', 'active',   'stripe', now(), now() + interval '1 month'),
    (elite_id, 'a1000000-0000-0000-0000-000000000003', 'active',   'stripe', now(), now() + interval '1 year'),
    (trial_id, 'a1000000-0000-0000-0000-000000000002', 'trialing', 'stripe', now(), now() + interval '14 days'),
    (admin_id, 'a1000000-0000-0000-0000-000000000003', 'active',   'manual', now(), now() + interval '100 years'),
    (sadmin_id,'a1000000-0000-0000-0000-000000000004', 'active',   'manual', now(), now() + interval '100 years')
  on conflict do nothing;

  -- Payments for pro and elite users
  insert into public.payments (user_id, provider, amount_usd, status, description, created_at)
  values
    (pro_id,   'stripe', 4.99,  'succeeded', 'Pro Monthly Subscription', now() - interval '1 month'),
    (pro_id,   'stripe', 4.99,  'succeeded', 'Pro Monthly Subscription', now()),
    (elite_id, 'stripe', 99.99, 'succeeded', 'Elite Annual Subscription', now() - interval '2 months')
  on conflict do nothing;

  -- AI usage logs
  insert into public.ai_usage_logs (user_id, feature, provider, model, prompt_tokens, completion_tokens, total_tokens, latency_ms, success)
  values
    (pro_id,    'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 450, 800, 1250, 1200, true),
    (pro_id,    'meal_recommendation',     'gemini', 'gemini-1.5-flash', 380, 950, 1330, 1450, true),
    (elite_id,  'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 520, 1100, 1620, 980,  true),
    (elite_id,  'meal_recommendation',     'gemini', 'gemini-1.5-flash', 410, 870, 1280, 1100, true),
    (elite_id,  'shopping_recommendation', 'gemini', 'gemini-1.5-flash', 390, 650, 1040, 890,  true),
    (free_id,   'exercise_recommendation', 'gemini', 'gemini-1.5-flash', 300, 500, 800,  2100, false) -- quota exceeded
  on conflict do nothing;

  -- Sample notifications
  insert into public.notifications (user_id, title, body, channel, category, is_read)
  values
    (pro_id,   'Workout Reminder',          'Time for your Tuesday workout!',              'in_app', 'workout_reminder', false),
    (pro_id,   'New PR Unlocked!',          'You hit a new personal record on Bench Press!','in_app', 'achievement',      false),
    (elite_id, 'Weekly Summary Ready',      'Your week 24 workout summary is available.',  'in_app', 'system',           true),
    (free_id,  'Upgrade to Pro',            'Unlock AI recommendations and remove ads.',   'in_app', 'promo',            false),
    (trial_id, 'Trial Ending Soon',         'Your Pro trial expires in 3 days.',           'in_app', 'system',           false)
  on conflict do nothing;

  -- Body logs
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

end;
$$;
