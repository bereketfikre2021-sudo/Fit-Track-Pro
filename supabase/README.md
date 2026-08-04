# FitTrack Pro — Supabase

## Folder structure

```
supabase/
├── config.toml               # Supabase CLI local dev config
├── schema.sql                # Full combined schema (reference / re-apply)
├── seed.sql                  # Global preset exercises
├── README.md                 # This file
└── migrations/
    ├── 20240101000000_init_extensions.sql          # pgcrypto
    ├── 20240101000001_shared_triggers.sql          # set_updated_at()
    ├── 20240101000002_users.sql                    # users table + RLS
    ├── 20240101000003_exercises.sql                # exercise library + RLS
    ├── 20240101000004_workout_schedule.sql         # weekly schedule + RLS
    ├── 20240101000005_workout_sessions_and_logs.sql # sessions, exercise_logs, sets + RLS
    ├── 20240101000006_nutrition.sql                # meal_plans, nutrition_logs + RLS
    ├── 20240101000007_progress.sql                 # body_logs (BMI trigger), water_logs + RLS
    ├── 20240101000008_workout_templates.sql        # templates + RLS
    ├── 20240101000009_views.sql                    # v_daily_macros, v_personal_records, v_weekly_summary
    └── 20240101000010_auth_trigger.sql             # auto-create user profile on sign-up
```

## Option A — Supabase Dashboard (quickest)

1. Go to your project → **SQL Editor → New query**
2. Paste `schema.sql` → **Run query**
3. Paste `seed.sql` → **Run query**

## Option B — Supabase CLI (recommended for teams)

```bash
# Install CLI
npm install -g supabase

# Link to your project
supabase login
supabase link --project-ref <your-project-ref>

# Push all migrations
supabase db push

# Seed preset exercises
supabase db execute --file supabase/seed.sql
```

## Option C — Local development

```bash
# Start local Supabase stack (Docker required)
supabase start

# Migrations run automatically on start.
# Seed manually:
supabase db execute --file supabase/seed.sql

# Stop
supabase stop
```

## Schema overview

| Table | Purpose |
|---|---|
| `users` | Profile: name, age, height, weight, gender, goal |
| `exercises` | Exercise library (global presets + user custom) |
| `workout_schedule` | Weekly recurring plan (exercises per day) |
| `workout_sessions` | Completed/skipped workout sessions |
| `exercise_logs` | Per-exercise record within a session |
| `sets` | Individual sets: reps, weight_kg, duration, RPE |
| `meal_plans` | Weekly repeating meal template |
| `nutrition_logs` | Daily food diary (calories, protein, carbs, fat) |
| `body_logs` | Weight history — BMI auto-calculated |
| `water_logs` | Daily water intake |
| `workout_templates` | Saved reusable workout plans |

### Views

| View | Returns |
|---|---|
| `v_daily_macros` | Aggregated daily calorie/macro totals |
| `v_personal_records` | All-time max weight and reps per exercise |
| `v_weekly_summary` | Sessions, exercises completed, avg duration per week |

## Security

Every table has **Row-Level Security** enabled. All policies use `auth.uid()` so users can only read and write their own data. The `exercises` table also allows reading rows where `user_id IS NULL` (global presets).
