-- ============================================================
--  Seed: App Settings & BMI Programs
-- ============================================================

-- ── App settings ─────────────────────────────────────────────────────────────
insert into public.app_settings (key, value, description, is_public) values
  ('app_version',          '"1.0.0"',                                  'Current app version',                        true),
  ('maintenance_mode',     'false',                                    'Disable all app access during maintenance',  false),
  ('min_app_version',      '"1.0.0"',                                  'Minimum client version required',            true),
  ('feature_flags',        '{"ai":true,"ads":true,"pdf":true,"offline":true,"ethiopian_foods":true}', 'Feature flags', true),
  ('ai_default_model',     '"gemini-1.5-flash"',                       'Default AI model for recommendations',       false),
  ('ai_fallback_model',    '"gemini-1.0-pro"',                         'Fallback AI model',                          false),
  ('max_file_upload_mb',   '10',                                       'Max upload size in MB',                      true),
  ('support_email',        '"support@fittrackpro.app"',                'Customer support email',                     true),
  ('terms_version',        '"2024-01-01"',                             'Current terms of service version',           true),
  ('privacy_version',      '"2024-01-01"',                             'Current privacy policy version',             true),
  ('trial_days',           '14',                                       'Length of Pro trial in days',                true),
  ('max_workout_days',     '7',                                        'Maximum workout days per week',              true),
  ('max_custom_exercises', '{"free":10,"pro":100,"elite":1000}',       'Custom exercise limits per tier',            false),
  ('storage_limits_mb',    '{"free":50,"pro":500,"elite":2000,"team":10000}', 'Storage limits per tier in MB',      false)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── BMI Programs ─────────────────────────────────────────────────────────────
insert into public.bmi_programs
  (id, name, description, program_type, target_bmi_min, target_bmi_max, target_bmi_category, duration_weeks, weekly_workouts, difficulty, features, workout_template_id, is_active, is_featured)
values
  (
    'b1000001-0000-0000-0000-000000000001',
    'Lean & Strong',
    'For users with normal BMI (18.5-24.9) who want to build muscle while staying lean. Combines strength training with nutrition tracking.',
    'muscle_gain',
    18.5, 24.9, 'normal',
    12, 4, 'intermediate',
    '{"required_tier":"free","ai_meal_plan":false,"custom_schedule":true}',
    'a1000001-0000-0000-0000-000000000001',
    true, true
  ),
  (
    'b1000001-0000-0000-0000-000000000002',
    'Fat Loss Accelerator',
    'Designed for overweight users (BMI 25-34.9). Progressive caloric deficit with high-volume training.',
    'weight_loss',
    25.0, 34.9, 'overweight',
    16, 5, 'beginner',
    '{"required_tier":"free","ai_meal_plan":false,"calorie_tracking":true}',
    'a1000001-0000-0000-0000-000000000005',
    true, true
  ),
  (
    'b1000001-0000-0000-0000-000000000003',
    'Healthy Start',
    'For underweight users who need to gain healthy weight. Focus on compound lifts and calorie surplus.',
    'muscle_gain',
    null, 18.4, 'underweight',
    12, 3, 'beginner',
    '{"required_tier":"free","ai_meal_plan":false}',
    'a1000001-0000-0000-0000-000000000004',
    true, false
  ),
  (
    'b1000001-0000-0000-0000-000000000004',
    'Elite Strength Builder',
    'Advanced strength program for users with optimal BMI. Focuses on powerlifting and strength gains.',
    'strength',
    18.5, 27.0, null,
    20, 4, 'advanced',
    '{"required_tier":"pro","ai_meal_plan":true,"custom_schedule":true}',
    'a1000001-0000-0000-0000-000000000002',
    true, false
  ),
  (
    'b1000001-0000-0000-0000-000000000005',
    'Mobility & Endurance',
    'For any BMI — focuses on cardiovascular health, flexibility, and functional fitness.',
    'endurance',
    null, null, null,
    8, 5, 'beginner',
    '{"required_tier":"free","ai_meal_plan":false}',
    'a1000001-0000-0000-0000-000000000006',
    true, false
  )
on conflict (id) do nothing;
