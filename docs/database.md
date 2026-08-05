# FitTrack Pro — Database Documentation

> **Supabase project:** `myyttidixinlbohlfftd.supabase.co`
> **Generated from:** migrations `20240301000000` → `20240301000010`

---

## Table of Contents

1. [Entity Relationship Diagram (ERD)](#erd)
2. [Table Descriptions](#tables)
3. [Relationships](#relationships)
4. [RLS Policy Summary](#rls)
5. [Storage Buckets](#storage)
6. [Auth Flow](#auth)

---

## 1. Entity Relationship Diagram (ERD) {#erd}

```
auth.users (Supabase managed)
  │
  ├──< user_roles            (role per user: user/moderator/admin/super_admin)
  ├──< user_subscriptions    (active plan per user)
  │      └──> subscription_plans
  ├──< payments              ──> invoices ──> billing_addresses
  │                          └──> payment_methods
  ├──< subscription_events   (lifecycle log: created/upgraded/cancelled)
  ├──< audit_logs            (immutable security trail)
  │
  ├──< users                 (public profile: height, weight, goals)
  │
  ├──< workout_sessions      ──> workout_templates
  │      └──< exercise_logs  ──> exercises
  │             └──< sets
  ├──< personal_records      ──> exercises
  │
  ├──< meal_plans            (weekly template: day + slot + foods)
  ├──< meal_logs             (daily diary entries) ──> foods
  ├──< shopping_list_items   ──> foods
  │
  ├──< body_logs             (weight + BMI over time)
  ├──< body_measurements     (chest, waist, hips, etc.)
  ├──< water_logs            (daily water intake)
  ├──< progress_photos       (storage path reference)
  │
  ├──< user_bmi_programs     ──> bmi_programs ──> workout_templates
  │
  ├──< ai_usage_logs         (quota tracking per feature)
  ├──< notifications         (in-app + push log)
  ├──< reports               (generated PDF/JSON reports)
  ├──< storage_metadata      (file tracking for all buckets)
  └──< user_app_settings     (per-user cross-device settings)

exercises ──< exercise_tags
exercises ──< exercise_likes  ──> auth.users

foods ──< ethiopian_foods     (Ethiopian-specific metadata)

subscription_plans (global, no owner)
bmi_programs       (global, no owner)
app_settings       (global, admin-managed)
```

---

## 2. Table Descriptions {#tables}

### Auth & Roles

#### `user_roles`
Assigns one or more roles to a user. Multiple rows per user allowed.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Row identifier |
| user_id | uuid FK → auth.users | The user |
| role | enum | `user` / `moderator` / `admin` / `super_admin` |
| granted_by | uuid FK → auth.users | Admin who granted the role |
| granted_at | timestamptz | When granted |
| expires_at | timestamptz | Optional expiry (null = permanent) |


### Subscription & Billing

#### `subscription_plans`
Global plans available to all users. No owner (admin-managed).

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Plan identifier |
| name | text | Display name (Free, Pro, Elite, Team) |
| tier | enum UNIQUE | `free` / `pro` / `elite` / `team` |
| price_monthly_usd | numeric | Monthly price |
| price_yearly_usd | numeric | Yearly price |
| max_ai_calls_day | integer | Daily AI quota |
| max_devices | integer | Simultaneous device limit |
| features | jsonb | Feature flags (ads, pdf, export, etc.) |
| stripe_price_id_monthly | text | Stripe price ID for monthly billing |
| stripe_price_id_yearly | text | Stripe price ID for yearly billing |

#### `user_subscriptions`
Each user's current and past subscription.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Subscription identifier |
| user_id | uuid FK → auth.users | Owner |
| plan_id | uuid FK → subscription_plans | Selected plan |
| status | enum | `active` / `trialing` / `cancelled` / `expired` / `past_due` / `paused` |
| provider | enum | `stripe` / `paypal` / `apple` / `google` / `manual` |
| provider_sub_id | text | Stripe `sub_xxx` ID |
| current_period_start/end | timestamptz | Billing cycle |
| cancel_at_period_end | boolean | Scheduled cancellation |
| trial_start/end | timestamptz | Trial window |

#### `payments`
Individual payment records linked to subscriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Payment identifier |
| user_id | uuid FK → auth.users | Payer |
| subscription_id | uuid FK → user_subscriptions | Related subscription |
| provider | enum | Payment processor |
| provider_payment_id | text | Stripe `pi_xxx` ID |
| amount_usd | numeric | Charged amount |
| status | enum | `pending` / `succeeded` / `failed` / `refunded` / `disputed` |
| invoice_id | uuid FK → invoices | Linked invoice |
| idempotency_key | text UNIQUE | Prevents duplicate charges |
| fee_usd | numeric | Processor fee |
| net_usd | numeric | Amount after fee |

#### `invoices`
Full invoice records for subscription payments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Invoice identifier |
| invoice_number | text UNIQUE | Auto-generated (FTP-2024-00001) |
| user_id | uuid FK → auth.users | Customer |
| subscription_id | uuid FK | Related subscription |
| status | enum | `draft` / `open` / `paid` / `void` / `uncollectible` |
| total_usd | numeric | Invoice total |
| amount_due_usd | numeric | Generated column (total - paid) |
| line_items | jsonb | Array of line items with description/qty/price |
| customer_name/email/address | text/jsonb | Snapshot at invoice time |
| pdf_url | text | Hosted PDF link |

#### `subscription_events`
Immutable lifecycle log (created, upgraded, downgraded, cancelled, renewed).

#### `billing_addresses`
User billing addresses for invoices and payment processing.

#### `payment_methods`
Saved payment methods (Stripe card tokens, mobile money, etc.).

#### `audit_logs`
Immutable append-only security trail. No updates or deletes allowed.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Log entry |
| user_id | uuid FK → auth.users | Actor (nullable — system actions) |
| action | enum | `insert` / `update` / `delete` / `login` / `logout` / `export` / `admin_action` |
| table_name | text | Affected table |
| record_id | uuid | Affected row |
| old_values / new_values | jsonb | Before/after snapshot |
| ip_address | inet | Client IP |
| severity | text | `info` / `warning` / `error` / `critical` |


### User Profile & Settings

#### `users` (public profile)
Extends `auth.users` with fitness-specific profile data.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK FK → auth.users | Same ID as auth user |
| name | text | Display name |
| gender | text | `male` / `female` / `other` |
| height_cm | numeric | Height in centimetres |
| current_weight_kg | numeric | Current weight |
| target_weight_kg | numeric | Goal weight |
| fitness_goal | text | `fat` / `muscle` / `strength` / `endurance` / `maintenance` |
| fitness_level | text | `beginner` / `intermediate` / `advanced` |
| focus_area | text | `full-body` / `upper` / `lower` / `core` |
| equipment | text[] | Available equipment list |
| workout_days | text[] | Selected workout days (e.g. `['Monday','Wednesday']`) |
| avatar_url | text | Storage path or external URL |
| registration_date | date | First sign-up date |

#### `user_app_settings`
Per-user cross-device settings stored server-side (language, theme, notification prefs, etc.).

#### `app_settings`
Global application settings managed by admins (feature flags, maintenance mode, AI model, etc.).

---

### Exercise Library

#### `exercises`
Global and user-created exercises. `user_id = null` means global/preset.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Exercise identifier |
| user_id | uuid FK → auth.users (nullable) | null = global |
| name | text | Exercise name |
| muscle_group | text | Primary muscle (Chest, Back, etc.) |
| equipment | text | Required equipment |
| phase | text | `warmup` / `main` / `cooldown` |
| is_time_based | boolean | Timer exercise vs rep-based |
| category | enum | `strength` / `cardio` / `mobility` / `yoga` etc. |
| difficulty | enum | `beginner` / `intermediate` / `advanced` / `elite` |
| is_compound | boolean | Compound (multi-joint) movement |
| met_value | numeric | Metabolic equivalent for calorie calculation |
| instructions | text | How to perform the exercise |
| tips | text | Form cues and coaching tips |
| is_featured | boolean | Shown in featured/recommended lists |
| deleted_at | timestamptz | Soft delete (null = active) |

#### `exercise_tags`
Many-to-many tags for exercises (glute, beginner_friendly, shoulder_health, etc.).

#### `exercise_likes`
Users liking exercises. Composite PK `(user_id, exercise_id)`.

#### `workout_templates`
Reusable workout programs. `user_id = null` = system preset, not null = user-created.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Template identifier |
| user_id | uuid FK (nullable) | null = global preset |
| name | text | Template name |
| description | text | Summary |
| exercises | jsonb | Array of exercise objects with sets/reps/rest |
| is_public | boolean | Visible to other users |
| category | enum | `strength` / `cardio` / `mobility` etc. |
| difficulty | enum | Difficulty level |
| duration_min | integer | Estimated duration in minutes |
| tags | text[] | Search tags |
| is_featured | boolean | Shown in featured lists |
| forked_from | uuid FK → workout_templates | If copied from another template |

---

### Workout Tracking

#### `workout_sessions`
One row per completed or skipped workout session.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Session identifier |
| user_id | uuid FK → auth.users | Athlete |
| day_of_week | text | e.g. `Monday` |
| session_date | date | Calendar date |
| started_at / ended_at | timestamptz | Session times |
| completed_count | integer | Exercises completed |
| total_count | integer | Total exercises planned |
| skipped | boolean | Whether the session was skipped |
| skip_reason | text | `injury` / `busy` / `transfer` |
| template_id | uuid FK → workout_templates | Template used |
| calories_burned | integer | Estimated calories |
| perceived_effort | smallint | RPE scale 1–10 |
| mood | smallint | Mood score 1–5 |

#### `exercise_logs`
Individual exercise entries within a session.

#### `sets`
Individual set data (reps, weight) within an exercise log. Triggers auto-check for personal records.

#### `personal_records`
All-time bests per user per exercise per record type (`max_weight`, `max_reps`, `max_volume`, `min_time`, etc.). Auto-updated by trigger on `sets` insert.


### Nutrition

#### `foods`
Global food database plus user-created items. `user_id = null` = global.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Food identifier |
| user_id | uuid FK (nullable) | null = global |
| name | text | English name |
| name_am | text | Amharic name |
| source | enum | `usda` / `openfoodfacts` / `ethiopian` / `custom` / `ai_generated` |
| calories | numeric | Per serving |
| protein_g / carbs_g / fat_g / fiber_g | numeric | Macros |
| sodium_mg / potassium_mg / vitamin_c_mg / iron_mg / calcium_mg | numeric | Micros |
| barcode | text | UPC/EAN for scanning |
| is_verified | boolean | Verified by admin |
| is_featured | boolean | Featured in app |
| tags | text[] | Search tags |

#### `ethiopian_foods`
Ethiopian-specific metadata linked to a `foods` row.

| Column | Type | Description |
|--------|------|-------------|
| food_id | uuid FK → foods | Linked food item |
| name_en / name_am | text | Names in both languages |
| category | text | `injera_based` / `stew` / `grain` / `beverage` / `snack` etc. |
| region | text | `national` / `addis_ababa` / `tigray` / `oromia` etc. |
| is_vegan / is_vegetarian | boolean | Dietary classifications |
| is_fasting_safe | boolean | Safe for Ethiopian Orthodox fasting |
| common_ingredients | text[] | Key ingredients |

#### `meal_plans`
Weekly meal plan template per user (day + slot + food items stored as rows).

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid FK | Owner |
| day_of_week | text | `Monday` … `Sunday` |
| meal_slot | text | `breakfast` / `morningSnack` / `lunch` / `afternoonSnack` / `dinner` / `beforeBed` |
| food_name | text | Food name |
| calories / protein_g / carbs_g / fat_g | numeric | Per serving |

#### `meal_logs`
Daily food diary — actual foods consumed each day (linked to `foods` if available).

#### `shopping_list_items`
Persistent shopping list with category grouping, checked state, and week reference.

---

### Progress & Body Tracking

#### `body_logs`
Weight + BMI history. BMI auto-calculated by DB trigger using height from `users`.

#### `body_measurements`
Full body measurement log (chest, waist, hips, arms, thighs, body fat %, muscle mass).

#### `water_logs`
Daily water intake. One row per user per date with cups logged and goal.

#### `progress_photos`
References to photos stored in the `progress_photos` Storage bucket.

#### `bmi_programs`
System-defined fitness programs matched to BMI categories. Global (no user_id).

| Column | Type | Description |
|--------|------|-------------|
| program_type | enum | `weight_loss` / `muscle_gain` / `maintenance` / `endurance` / `strength` |
| target_bmi_min/max | numeric | BMI range this program targets |
| target_bmi_category | enum | `underweight` / `normal` / `overweight` / `obese_1-3` |
| workout_template_id | uuid FK | Linked workout template |
| features | jsonb | Required subscription tier |

#### `user_bmi_programs`
User enrollment and week-by-week progress in a BMI program.

---

### AI, Reports & Notifications

#### `ai_usage_logs`
Every AI API call. Used for quota enforcement and analytics.

| Column | Type | Description |
|--------|------|-------------|
| feature | enum | `exercise_recommendation` / `meal_recommendation` / `shopping_recommendation` / `chat` / `analysis` |
| provider | enum | `gemini` / `openai` / `anthropic` |
| model | text | Model name (e.g. `gemini-1.5-flash`) |
| prompt_tokens / completion_tokens / total_tokens | integer | Token usage |
| latency_ms | integer | Response time |
| success | boolean | Whether the call succeeded |
| request_hash | text | Hash of prompt to detect duplicates |

#### `notifications`
In-app and push notification log.

| Column | Type | Description |
|--------|------|-------------|
| channel | enum | `push` / `email` / `in_app` / `sms` |
| priority | enum | `low` / `normal` / `high` / `urgent` |
| category | text | `workout_reminder` / `achievement` / `system` / `promo` |
| is_read | boolean | Read state |
| action_url | text | Deep link URL |

#### `reports`
Generated user reports cached as JSON or PDF references in Storage.

#### `storage_metadata`
Tracks every file stored in any Storage bucket (size, dimensions, MIME type, processing status).


---

## 3. Relationships {#relationships}

### One-to-One
| Table A | Table B | Key |
|---------|---------|-----|
| auth.users | users | `users.id = auth.users.id` |
| auth.users | user_app_settings | `user_app_settings.user_id` |

### One-to-Many
| Parent | Child | FK Column |
|--------|-------|-----------|
| auth.users | user_roles | `user_id` |
| auth.users | user_subscriptions | `user_id` |
| auth.users | payments | `user_id` |
| auth.users | workout_sessions | `user_id` |
| auth.users | body_logs | `user_id` |
| auth.users | meal_plans | `user_id` |
| auth.users | meal_logs | `user_id` |
| auth.users | notifications | `user_id` |
| auth.users | ai_usage_logs | `user_id` |
| auth.users | audit_logs | `user_id` |
| auth.users | progress_photos | `user_id` |
| auth.users | personal_records | `user_id` |
| auth.users | shopping_list_items | `user_id` |
| auth.users | reports | `user_id` |
| auth.users | storage_metadata | `user_id` |
| auth.users | billing_addresses | `user_id` |
| auth.users | payment_methods | `user_id` |
| auth.users | invoices | `user_id` |
| subscription_plans | user_subscriptions | `plan_id` |
| user_subscriptions | subscription_events | `subscription_id` |
| user_subscriptions | payments | `subscription_id` |
| user_subscriptions | invoices | `subscription_id` |
| invoices | payments | `invoice_id` |
| workout_templates | workout_sessions | `template_id` |
| workout_templates | bmi_programs | `workout_template_id` |
| workout_sessions | exercise_logs | `session_id` |
| exercise_logs | sets | `exercise_log_id` |
| exercises | exercise_logs | `exercise_id` |
| exercises | exercise_tags | `exercise_id` |
| exercises | exercise_likes | `exercise_id` |
| exercises | personal_records | `exercise_id` |
| foods | meal_logs | `food_id` |
| foods | shopping_list_items | `food_id` |
| foods | ethiopian_foods | `food_id` |
| bmi_programs | user_bmi_programs | `program_id` |

### Self-Referential
| Table | Column | Description |
|-------|--------|-------------|
| workout_templates | forked_from | Template forked from another template |
| user_roles | granted_by | Admin who granted the role |
| subscription_events | old_plan_id / new_plan_id | Both reference subscription_plans |

---

## 4. RLS Policy Summary {#rls}

All tables have Row Level Security enabled. The general pattern is:

### User-Owned Tables
Users can only access their own rows. Admins get read-only access via a bypass policy.

| Rule | Tables |
|------|--------|
| `auth.uid() = user_id` (full access) | workout_sessions, exercise_logs, sets, body_logs, water_logs, meal_plans, meal_logs, notifications, ai_usage_logs, reports, progress_photos, body_measurements, personal_records, shopping_list_items, user_bmi_programs, storage_metadata, user_app_settings |
| Read own only | payments, user_subscriptions (require verified email) |
| Admin read-all bypass | All above tables |

### Global/Preset Tables
| Rule | Tables |
|------|--------|
| `SELECT` open to all | subscription_plans, exercises (user_id null or own), foods (user_id null or own), ethiopian_foods, bmi_programs (is_active=true), exercise_tags, app_settings (is_public=true) |
| Admin manage | subscription_plans, bmi_programs, ethiopian_foods, app_settings |

### Special Policies
| Policy | Description |
|--------|-------------|
| Immutable audit_logs | INSERT only — UPDATE and DELETE blocked for everyone |
| Immutable subscription_events | INSERT only — no updates or deletes |
| Immutable invoices (paid) | Only `draft`/`open` invoices can be updated |
| No invoice deletes | Void instead of delete |
| AI quota enforcement | INSERT on ai_usage_logs blocked if daily quota exceeded |
| Email verification gate | payments and user_subscriptions require `is_verified_user()` |
| Role self-grant prevention | Users cannot insert their own user_roles |

### Helper Functions (security definer)
| Function | Returns | Purpose |
|----------|---------|---------|
| `is_admin()` | boolean | True if current user has admin or super_admin role |
| `is_super_admin()` | boolean | True if super_admin |
| `is_verified_user()` | boolean | True if email is confirmed |
| `current_user_role()` | text | Highest role for current user |
| `check_ai_quota(user_id, feature)` | boolean | True if within daily AI limit |


---

## 5. Storage Buckets {#storage}

Six buckets are defined. All are private except `avatars` (publicly readable).

### Bucket: `avatars`
- **Access:** Public read, authenticated write
- **Path pattern:** `{user_id}/{filename}`
- **Used by:** `users.avatar_url`, profile photo upload
- **Policy:** Users upload to their own folder; anyone can read

### Bucket: `progress_photos`
- **Access:** Private (owner only)
- **Path pattern:** `{user_id}/{date}-{filename}`
- **Used by:** `progress_photos.storage_path`
- **Policy:** Users manage their own photos only

### Bucket: `exercise_media`
- **Access:** Public read (global exercises), private (user exercises)
- **Path pattern:** `global/{exercise_id}` or `{user_id}/{exercise_id}`
- **Used by:** `exercises.video_url`, `exercises.thumbnail_url`
- **Policy:** Global media readable by all; user media by owner

### Bucket: `meal_photos`
- **Access:** Private (owner only)
- **Path pattern:** `{user_id}/{date}-{meal_slot}`
- **Used by:** meal log entries with photo attachments
- **Policy:** Users manage their own photos only

### Bucket: `exports`
- **Access:** Private (owner only)
- **Path pattern:** `{user_id}/{timestamp}-{export_type}.{ext}`
- **Used by:** PDF exports of meal plans, shopping lists, reports
- **Policy:** Users manage their own exports only

### Bucket: `reports`
- **Access:** Private (owner only)
- **Path pattern:** `{user_id}/{report_id}.pdf`
- **Used by:** `reports.storage_path`
- **Policy:** Users manage their own reports only

### File Tracking
Every file uploaded to any bucket should have a corresponding row in `storage_metadata` for:
- Quota enforcement (total storage per tier: Free 50MB, Pro 500MB, Elite 2GB, Team 10GB)
- File type validation
- Soft-delete tracking (`deleted_at`)
- Processing status (image resize, video transcoding)

---

## 6. Auth Flow {#auth}

FitTrack Pro uses Supabase Auth with PKCE flow for OAuth.

### Sign-Up (Email/Password)
```
User fills signup form
  → supabase.auth.signUp({ email, password, options: { emailRedirectTo: origin/auth/confirm } })
  → Supabase sends confirmation email
  → User clicks link → redirected to /auth/confirm
  → AuthConfirmPage exchanges token → session established
  → App checks loadAllFromSupabase(userId)
      → profile exists with height + workoutDays? → go to /
      → profile incomplete? → go to /onboarding
```

### Sign-In (Email/Password)
```
User fills login form
  → supabase.auth.signInWithPassword({ email, password })
  → onAuthStateChange fires with SIGNED_IN event
  → audit_logs INSERT { action: 'login', provider: 'email' }
  → loadAllFromSupabase(userId) → merge into localStorage state
  → onboarded + planSetupComplete? → /  else → /onboarding
```

### Google OAuth (PKCE)
```
User clicks "Continue with Google"
  → supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin/ } })
  → Supabase redirects to Google
  → Google returns to Supabase callback URL
  → Supabase exchanges code → PKCE verified → session created
  → User redirected to origin/ (custom domain: app.bereketfikre.et)
  → onAuthStateChange fires → same flow as email sign-in
  → Google users: email_confirmed_at is set automatically (no email verify step)
```

### Magic Link (Passwordless)
```
User enters email on login page → clicks "Send magic link"
  → supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin/ } })
  → Supabase sends OTP email
  → User clicks link → session established at origin/
  → Same onboarding check as above
```

### Password Reset
```
User clicks "Forgot password" → enters email
  → supabase.auth.resetPasswordForEmail(email, { redirectTo: origin/auth/reset-password })
  → Supabase sends reset email
  → User clicks link → redirected to /auth/reset-password with token
  → User enters new password → supabase.auth.updateUser({ password })
  → Session remains active
```

### Session Management
- Sessions are persisted in `localStorage` by the Supabase client (`detectSessionInUrl: true`)
- Auto token refresh is handled by `@supabase/supabase-js` — no manual refresh needed
- On sign-out: `supabase.auth.signOut()` + `clearAppState()` wipes all local data
- `cloudLoadedFor` ref prevents re-loading cloud data on every re-render

### Role Loading
```
After any sign-in event:
  → loadRoles(userId) queries public.user_roles
  → Sets React context: roles[], isAdmin, isSuperAdmin, isModerator
  → Default: ['user'] if no rows found
  → Roles are cached per session (rolesLoadedFor ref)
```

### Route Protection
| Guard | Behaviour |
|-------|-----------|
| `AuthGuard` | Redirects to `/login` if no session |
| `RequireOnboarded` | Redirects to `/onboarding` if not onboarded |
| `RequirePlanSetupDone` | Redirects to `/setup` if plan not configured |
| `AdminGuard` | Redirects to `/` if not admin/super_admin |
| `RequireEmailVerified` | Shows verification prompt if email unconfirmed (skipped for OAuth) |

### New User vs Returning User
```
loadAllFromSupabase returns profile from public.users:
  isFullyOnboarded = name.trim() && height && workoutDays.length > 0

  true  → onboarded=true, planSetupComplete=true → go to /
  false → onboarded=false → go to /onboarding
```

---

## Views (Quick Reference)

| View | Description |
|------|-------------|
| `v_active_subscriptions` | Active/trialing subscriptions with plan features |
| `v_exercise_library` | All non-deleted exercises with aggregated tags |
| `v_workout_summary` | Weekly/monthly workout stats per user |
| `v_daily_nutrition` | Daily macro totals per meal slot |
| `v_user_progress` | Weight + BMI + measurements combined |
| `v_unread_notifications` | Unread notification counts per user |
| `v_admin_user_overview` | All users with role + subscription (admin only) |
| `v_admin_revenue` | Monthly revenue by provider and status |
| `v_user_invoices` | Invoice list per user with plan details |
| `v_admin_billing_dashboard` | Monthly revenue breakdown (gross, net, fees) |

## Triggers (Quick Reference)

| Trigger | Table | Purpose |
|---------|-------|---------|
| `trg_check_pr_after_set` | sets | Auto-update personal_records on new set |
| `trg_audit_subscriptions` | user_subscriptions | Auto-log changes to audit_logs |
| `trg_audit_payments` | payments | Auto-log changes to audit_logs |
| `trg_invoice_number` | invoices | Auto-generate FTP-YYYY-NNNNN number |
| `trg_*_updated_at` | multiple | Auto-update updated_at timestamp |

## Stored Functions (Quick Reference)

| Function | Purpose |
|----------|---------|
| `get_user_dashboard_stats(user_id)` | Single jsonb with all home screen stats |
| `search_exercises(query, limit)` | Full-text search on exercises |
| `upsert_personal_record(...)` | Insert or update a PR if new value is better |
| `check_ai_quota(user_id, feature)` | Returns true if user is within daily AI limit |
| `soft_delete_exercise(exercise_id)` | Sets deleted_at instead of hard delete |
| `mark_notification_read(id)` | Marks one notification read |
| `mark_all_notifications_read()` | Marks all unread notifications read |
| `void_invoice(id, reason)` | Admin-only invoice voiding with audit log |
| `generate_invoice_number()` | Trigger function: FTP-YYYY-NNNNN sequence |
| `cleanup_expired_reports()` | Deletes reports past their expires_at |
