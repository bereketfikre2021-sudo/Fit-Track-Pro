-- ============================================================
--  Migration — add meal_reminder_times to notification_preferences
--  Stores per-slot reminder times as JSONB so the Edge Function
--  can read them when scheduling push notifications.
-- ============================================================

alter table public.notification_preferences
  add column if not exists meal_reminder_times jsonb default '{}'::jsonb;

comment on column public.notification_preferences.meal_reminder_times is
  'Per-slot meal reminder times e.g. {"breakfast":"07:00","lunch":"13:00",...}';
