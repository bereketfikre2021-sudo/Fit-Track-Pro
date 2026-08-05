-- ============================================================
--  Seed: Exercise Library (global presets, user_id = NULL)
--  Extends the existing seed.sql with additional exercises
--  using the new extended columns.
-- ============================================================

-- Update existing preset exercises with extended metadata
update public.exercises set
  category       = 'strength',
  difficulty     = 'intermediate',
  is_compound    = true,
  met_value      = 6.0,
  instructions   = 'Grip the bar just outside shoulder width. Lower bar to chest with control. Press back up to lockout.'
where name = 'Bench Press' and user_id is null;

update public.exercises set
  category       = 'strength',
  difficulty     = 'intermediate',
  is_compound    = true,
  met_value      = 6.0
where name = 'Squat' and user_id is null;

update public.exercises set
  category       = 'strength',
  difficulty     = 'advanced',
  is_compound    = true,
  met_value      = 6.5
where name = 'Deadlift' and user_id is null;

-- ── Insert additional global exercises ────────────────────────────────────────
insert into public.exercises
  (id, user_id, name, muscle_group, equipment, phase, is_time_based, category, difficulty, is_compound, met_value, instructions, tips, is_featured)
values
  -- Compound strength
  ('e0000001-0000-0000-0000-000000000001', null, 'Romanian Deadlift',      'Hamstrings',  'Barbell',    'main',    false, 'strength',  'intermediate', true,  5.5, 'Hinge at the hips with a soft knee bend. Lower bar along legs, feel hamstring stretch, drive hips forward to return.', 'Keep bar close to shins throughout.', false),
  ('e0000001-0000-0000-0000-000000000002', null, 'Bulgarian Split Squat',  'Quadriceps',  'Dumbbell',   'main',    false, 'strength',  'intermediate', false, 5.0, 'Rear foot elevated on bench. Lower front knee toward floor, keeping torso upright.', 'Keep front knee tracking over toes.', false),
  ('e0000001-0000-0000-0000-000000000003', null, 'Hip Thrust',             'Glutes',      'Barbell',    'main',    false, 'strength',  'beginner',     false, 4.5, 'Shoulders on bench, bar across hips. Drive hips up until body is straight, squeeze glutes at top.', 'Use a pad for comfort.', true),
  ('e0000001-0000-0000-0000-000000000004', null, 'Nordic Hamstring Curl',  'Hamstrings',  'Bodyweight', 'main',    false, 'strength',  'advanced',     false, 5.0, 'Kneel with feet anchored. Lower body forward as slowly as possible, catch yourself, push back up.', 'One of the best exercises for hamstring injury prevention.', false),
  ('e0000001-0000-0000-0000-000000000005', null, 'Incline Dumbbell Press', 'Chest',       'Dumbbell',   'main',    false, 'strength',  'intermediate', true,  5.0, 'Set bench to 30-45°. Press dumbbells up and slightly inward, lower with control.', 'Don''t let elbows flare excessively.', false),
  ('e0000001-0000-0000-0000-000000000006', null, 'Cable Fly',             'Chest',        'Cable',      'main',    false, 'strength',  'beginner',     false, 4.0, 'Stand between cables set high. Bring handles together in front of chest in a hugging motion.', 'Slight bend in elbows throughout.', false),
  ('e0000001-0000-0000-0000-000000000007', null, 'Face Pull',             'Shoulders',    'Cable',      'main',    false, 'strength',  'beginner',     false, 3.5, 'Pull rope to face level with elbows high. External rotate at end of movement.', 'Great for shoulder health and posture.', true),
  ('e0000001-0000-0000-0000-000000000008', null, 'Meadows Row',           'Back',         'Barbell',    'main',    false, 'strength',  'intermediate', false, 5.0, 'Straddle a landmine, grip end of bar, row to hip.', 'Allows deep stretch and strong contraction.', false),
  ('e0000001-0000-0000-0000-000000000009', null, 'Chest Supported Row',   'Back',         'Dumbbell',   'main',    false, 'strength',  'beginner',     false, 4.5, 'Lie prone on incline bench, row dumbbells to hips.', 'Removes lower back stress from regular rows.', false),
  ('e0000001-0000-0000-0000-000000000010', null, 'Tricep Dips',           'Triceps',      'Bodyweight', 'main',    false, 'strength',  'intermediate', false, 4.5, 'Support on parallel bars, lower until elbows at 90°, press back up.', 'Lean forward for more chest activation.', false),
  -- Cardio
  ('e0000001-0000-0000-0000-000000000011', null, 'Treadmill Run',         'Cardio',       'Machine',    'main',    true,  'cardio',    'beginner',     false, 9.5, 'Maintain comfortable pace. Land midfoot, keep torso upright.', 'Start with walk/run intervals if new to running.', false),
  ('e0000001-0000-0000-0000-000000000012', null, 'Box Jump',              'Quadriceps',   'Box',        'main',    false, 'cardio',    'intermediate', true,  8.0, 'Stand facing box, squat slightly and explode up landing softly on box. Step down.', 'Always step down — never jump down.', false),
  ('e0000001-0000-0000-0000-000000000013', null, 'Battle Ropes',          'Full Body',    'Battle Ropes','main',  true,  'cardio',    'intermediate', true,  10.0,'Alternate arm waves for time. Keep core tight.', 'Great metabolic conditioning tool.', false),
  ('e0000001-0000-0000-0000-000000000014', null, 'Assault Bike',          'Cardio',       'Machine',    'main',    true,  'cardio',    'beginner',     true,  12.0,'Pedal and push/pull handles simultaneously. Control breathing.', 'One of the highest calorie-burning machines.', false),
  ('e0000001-0000-0000-0000-000000000015', null, 'Sled Push',             'Full Body',    'Sled',       'main',    false, 'cardio',    'intermediate', true,  9.0, 'Low body position, drive through legs to push sled. Arms straight.', 'Excellent for quad development and conditioning.', false),
  -- Mobility / warmup / cooldown
  ('e0000001-0000-0000-0000-000000000016', null, 'World''s Greatest Stretch','Full Body',  'Bodyweight', 'warmup',  true,  'mobility',  'beginner',     false, 2.5, 'Step into lunge, rotate arm toward sky, hold, repeat.', 'Warms up hips, thoracic spine, and shoulders.', true),
  ('e0000001-0000-0000-0000-000000000017', null, 'Hip 90/90 Stretch',     'Hips',         'Bodyweight', 'cooldown',true,  'mobility',  'beginner',     false, 1.5, 'Sit with both legs at 90°. Lean over front shin. Hold.', 'Excellent for hip flexor and external rotator flexibility.', false),
  ('e0000001-0000-0000-0000-000000000018', null, 'Band Pull Apart',       'Shoulders',    'Bands',      'warmup',  false, 'mobility',  'beginner',     false, 2.0, 'Hold band at shoulder width. Pull apart to chest level, squeeze shoulder blades.', 'Essential shoulder warm-up.', false),
  ('e0000001-0000-0000-0000-000000000019', null, 'Cat-Cow Stretch',       'Core',         'Bodyweight', 'warmup',  true,  'mobility',  'beginner',     false, 1.5, 'On hands and knees, alternate arching and rounding the spine rhythmically.', 'Breathe in on cow, out on cat.', false),
  ('e0000001-0000-0000-0000-000000000020', null, 'Couch Stretch',         'Quadriceps',   'Bodyweight', 'cooldown',true,  'mobility',  'beginner',     false, 1.5, 'Rear knee on floor, rear foot against wall. Drive hips forward.', 'Addresses quad and hip flexor tightness from sitting.', false)
on conflict (id) do nothing;

-- ── Add tags to featured exercises ───────────────────────────────────────────
insert into public.exercise_tags (exercise_id, tag) values
  ('e0000001-0000-0000-0000-000000000003', 'glute'),
  ('e0000001-0000-0000-0000-000000000003', 'beginner_friendly'),
  ('e0000001-0000-0000-0000-000000000007', 'shoulder_health'),
  ('e0000001-0000-0000-0000-000000000007', 'posture'),
  ('e0000001-0000-0000-0000-000000000016', 'full_body_warmup'),
  ('e0000001-0000-0000-0000-000000000016', 'mobility')
on conflict (exercise_id, tag) do nothing;
