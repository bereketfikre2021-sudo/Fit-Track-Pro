-- ============================================================
--  FitTrack Pro — Seed data
--  Global preset exercises (user_id IS NULL = available to everyone).
--  Run after migrations.
-- ============================================================

insert into public.exercises (id, user_id, name, muscle_group, equipment, phase, is_time_based)
values
  -- ── Warm-ups ───────────────────────────────────────────────
  (gen_random_uuid(), null, 'Jump Rope',          'Cardio',       'Jump Rope',  'warmup', true),
  (gen_random_uuid(), null, 'Jumping Jacks',      'Cardio',       'Bodyweight', 'warmup', true),
  (gen_random_uuid(), null, 'Dynamic Stretching', 'Full Body',    'Bodyweight', 'warmup', true),
  (gen_random_uuid(), null, 'Arm Circles',        'Shoulders',    'Bodyweight', 'warmup', true),
  (gen_random_uuid(), null, 'Hip Circles',        'Hips',         'Bodyweight', 'warmup', true),

  -- ── Push (Chest / Shoulders / Triceps) ────────────────────
  (gen_random_uuid(), null, 'Bench Press',            'Chest',     'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Incline Bench Press',    'Chest',     'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Dumbbell Fly',            'Chest',     'Dumbbell',   'main', false),
  (gen_random_uuid(), null, 'Push-Up',                'Chest',     'Bodyweight', 'main', false),
  (gen_random_uuid(), null, 'Overhead Press',         'Shoulders', 'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Dumbbell Lateral Raise', 'Shoulders', 'Dumbbell',   'main', false),
  (gen_random_uuid(), null, 'Tricep Pushdown',        'Triceps',   'Cable',      'main', false),
  (gen_random_uuid(), null, 'Skull Crusher',          'Triceps',   'Barbell',    'main', false),

  -- ── Pull (Back / Biceps) ───────────────────────────────────
  (gen_random_uuid(), null, 'Deadlift',              'Back',    'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Pull-Up',               'Back',    'Bodyweight', 'main', false),
  (gen_random_uuid(), null, 'Barbell Row',           'Back',    'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Seated Cable Row',      'Back',    'Cable',      'main', false),
  (gen_random_uuid(), null, 'Lat Pulldown',          'Back',    'Machine',    'main', false),
  (gen_random_uuid(), null, 'Barbell Curl',          'Biceps',  'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Dumbbell Hammer Curl',  'Biceps',  'Dumbbell',   'main', false),

  -- ── Legs ───────────────────────────────────────────────────
  (gen_random_uuid(), null, 'Squat',             'Quadriceps', 'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Leg Press',         'Quadriceps', 'Machine',    'main', false),
  (gen_random_uuid(), null, 'Romanian Deadlift', 'Hamstrings', 'Barbell',    'main', false),
  (gen_random_uuid(), null, 'Leg Curl',          'Hamstrings', 'Machine',    'main', false),
  (gen_random_uuid(), null, 'Calf Raise',        'Calves',     'Machine',    'main', false),
  (gen_random_uuid(), null, 'Lunge',             'Quadriceps', 'Dumbbell',   'main', false),
  (gen_random_uuid(), null, 'Glute Bridge',      'Glutes',     'Bodyweight', 'main', false),

  -- ── Core ───────────────────────────────────────────────────
  (gen_random_uuid(), null, 'Plank',            'Core', 'Bodyweight', 'main', true),
  (gen_random_uuid(), null, 'Crunch',           'Core', 'Bodyweight', 'main', false),
  (gen_random_uuid(), null, 'Leg Raise',        'Core', 'Bodyweight', 'main', false),
  (gen_random_uuid(), null, 'Russian Twist',    'Core', 'Bodyweight', 'main', false),
  (gen_random_uuid(), null, 'Cable Crunch',     'Core', 'Cable',      'main', false),

  -- ── Cool-downs ─────────────────────────────────────────────
  (gen_random_uuid(), null, 'Static Stretching', 'Full Body', 'Bodyweight', 'cooldown', true),
  (gen_random_uuid(), null, 'Foam Rolling',      'Full Body', 'Foam Roller','cooldown', true),
  (gen_random_uuid(), null, 'Child''s Pose',     'Back',      'Bodyweight', 'cooldown', true),
  (gen_random_uuid(), null, 'Pigeon Pose',       'Hips',      'Bodyweight', 'cooldown', true)

on conflict do nothing;
