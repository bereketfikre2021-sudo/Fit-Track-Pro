-- ============================================================
--  Seed: Workout Templates (global — user_id = NULL)
-- ============================================================

insert into public.workout_templates
  (id, user_id, name, description, exercises, is_public, category, difficulty, duration_min, tags, is_featured)
values
  (
    'a1000001-0000-0000-0000-000000000001',
    null,
    'Push Day — Hypertrophy',
    'Chest, shoulders, and triceps focused hypertrophy session. 4 sets per exercise with moderate-heavy weight.',
    '[
      {"name":"Bench Press","sets":4,"reps":"8-10","restSeconds":90,"phase":"main"},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"10-12","restSeconds":75,"phase":"main"},
      {"name":"Cable Fly","sets":3,"reps":"12-15","restSeconds":60,"phase":"main"},
      {"name":"Overhead Press","sets":4,"reps":"8-10","restSeconds":90,"phase":"main"},
      {"name":"Dumbbell Lateral Raise","sets":3,"reps":"15-20","restSeconds":60,"phase":"main"},
      {"name":"Tricep Pushdown","sets":3,"reps":"12-15","restSeconds":60,"phase":"main"},
      {"name":"Skull Crusher","sets":3,"reps":"10-12","restSeconds":60,"phase":"main"}
    ]'::jsonb,
    true, 'strength', 'intermediate', 60,
    array['push','chest','shoulders','triceps','hypertrophy'],
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000002',
    null,
    'Pull Day — Strength',
    'Back and biceps strength session. Focus on heavy compound movements.',
    '[
      {"name":"Deadlift","sets":4,"reps":"5","restSeconds":180,"phase":"main"},
      {"name":"Barbell Row","sets":4,"reps":"6-8","restSeconds":120,"phase":"main"},
      {"name":"Pull-Up","sets":3,"reps":"8-10","restSeconds":90,"phase":"main"},
      {"name":"Seated Cable Row","sets":3,"reps":"10-12","restSeconds":75,"phase":"main"},
      {"name":"Face Pull","sets":3,"reps":"15","restSeconds":60,"phase":"main"},
      {"name":"Barbell Curl","sets":3,"reps":"10-12","restSeconds":60,"phase":"main"},
      {"name":"Dumbbell Hammer Curl","sets":2,"reps":"12-15","restSeconds":60,"phase":"main"}
    ]'::jsonb,
    true, 'strength', 'intermediate', 65,
    array['pull','back','biceps','strength'],
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000003',
    null,
    'Leg Day — Volume',
    'Full leg development with quad, hamstring, and glute focus.',
    '[
      {"name":"Squat","sets":4,"reps":"10","restSeconds":120,"phase":"main"},
      {"name":"Romanian Deadlift","sets":3,"reps":"10-12","restSeconds":90,"phase":"main"},
      {"name":"Leg Press","sets":3,"reps":"12-15","restSeconds":90,"phase":"main"},
      {"name":"Bulgarian Split Squat","sets":3,"reps":"10","restSeconds":75,"phase":"main"},
      {"name":"Hip Thrust","sets":3,"reps":"12-15","restSeconds":75,"phase":"main"},
      {"name":"Leg Curl","sets":3,"reps":"12","restSeconds":60,"phase":"main"},
      {"name":"Calf Raise","sets":4,"reps":"15-20","restSeconds":45,"phase":"main"},
      {"name":"Plank","sets":3,"reps":"60","isTimeBased":true,"restSeconds":60,"phase":"cooldown"}
    ]'::jsonb,
    true, 'strength', 'intermediate', 70,
    array['legs','quads','hamstrings','glutes','volume'],
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000004',
    null,
    'Full Body Beginner',
    'Three-day full body routine perfect for beginners. Covers all major muscle groups.',
    '[
      {"name":"Squat","sets":3,"reps":"10","restSeconds":90,"phase":"main"},
      {"name":"Bench Press","sets":3,"reps":"10","restSeconds":90,"phase":"main"},
      {"name":"Barbell Row","sets":3,"reps":"10","restSeconds":90,"phase":"main"},
      {"name":"Overhead Press","sets":3,"reps":"10","restSeconds":90,"phase":"main"},
      {"name":"Deadlift","sets":2,"reps":"8","restSeconds":120,"phase":"main"},
      {"name":"Plank","sets":2,"reps":"30","isTimeBased":true,"restSeconds":60,"phase":"cooldown"}
    ]'::jsonb,
    true, 'strength', 'beginner', 45,
    array['full_body','beginner','compound'],
    true
  ),
  (
    'a1000001-0000-0000-0000-000000000005',
    null,
    'HIIT Cardio Circuit',
    '30-minute high intensity interval training. No equipment needed.',
    '[
      {"name":"Jumping Jacks","sets":3,"reps":"30","isTimeBased":true,"restSeconds":15,"phase":"warmup"},
      {"name":"Push-Up","sets":4,"reps":"15","restSeconds":30,"phase":"main"},
      {"name":"Plank","sets":4,"reps":"45","isTimeBased":true,"restSeconds":30,"phase":"main"},
      {"name":"Crunch","sets":4,"reps":"20","restSeconds":30,"phase":"main"},
      {"name":"Glute Bridge","sets":3,"reps":"20","restSeconds":30,"phase":"main"},
      {"name":"Static Stretching","sets":1,"reps":"180","isTimeBased":true,"restSeconds":0,"phase":"cooldown"}
    ]'::jsonb,
    true, 'cardio', 'intermediate', 30,
    array['hiit','bodyweight','no_equipment','cardio'],
    false
  ),
  (
    'a1000001-0000-0000-0000-000000000006',
    null,
    'Mobility & Recovery',
    '45-minute active recovery session. Reduces soreness, improves range of motion.',
    '[
      {"name":"Cat-Cow Stretch","sets":2,"reps":"60","isTimeBased":true,"phase":"warmup"},
      {"name":"World''s Greatest Stretch","sets":2,"reps":"90","isTimeBased":true,"phase":"main"},
      {"name":"Hip 90/90 Stretch","sets":2,"reps":"120","isTimeBased":true,"phase":"main"},
      {"name":"Pigeon Pose","sets":2,"reps":"120","isTimeBased":true,"phase":"main"},
      {"name":"Couch Stretch","sets":2,"reps":"90","isTimeBased":true,"phase":"main"},
      {"name":"Child''s Pose","sets":2,"reps":"60","isTimeBased":true,"phase":"cooldown"},
      {"name":"Foam Rolling","sets":1,"reps":"300","isTimeBased":true,"phase":"cooldown"}
    ]'::jsonb,
    true, 'mobility', 'beginner', 45,
    array['recovery','mobility','stretching','beginner_friendly'],
    false
  )
on conflict (id) do nothing;
