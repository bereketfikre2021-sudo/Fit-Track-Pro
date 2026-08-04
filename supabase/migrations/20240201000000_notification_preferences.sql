-- ============================================================
--  Migration — notification_preferences table
--
--  Stores per-user, per-device FCM tokens and notification
--  preference flags. One row per (user_id, platform) pair.
-- ============================================================

create table if not exists public.notification_preferences (
  id              uuid         primary key default gen_random_uuid(),
  user_id         uuid         not null references public.users(id) on delete cascade,

  -- FCM registration token for this device / browser profile.
  -- NULL until the user grants permission and FCM issues a token.
  fcm_token       text,

  -- Platform discriminator so the same user can have separate tokens
  -- for their phone browser and desktop browser.
  -- Values: 'web' | 'android-web' | 'ios-web'
  platform        text         not null default 'web',

  -- Master toggle — when false, no push notifications are sent from the server.
  notifications_enabled    boolean not null default false,

  -- Granular toggles for each reminder type
  workout_reminders_enabled boolean not null default false,
  meal_reminders_enabled    boolean not null default false,
  water_reminders_enabled   boolean not null default false,
  progress_reminders_enabled boolean not null default false,

  -- Time-of-day preferences (HH:MM 24h strings)
  workout_reminder_time     text    not null default '07:00',
  water_reminder_interval   integer not null default 2  -- hours between reminders
    check (water_reminder_interval between 1 and 12),

  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now(),

  -- One row per user per platform
  unique (user_id, platform)
);

comment on table public.notification_preferences is
  'Per-user, per-device FCM tokens and notification preference flags.';

create index idx_notif_prefs_user_id
  on public.notification_preferences(user_id);

-- Auto-update updated_at
create trigger trg_notif_prefs_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_updated_at();

-- Row-Level Security
alter table public.notification_preferences enable row level security;

drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
drop policy if exists "notif_prefs_insert_own" on public.notification_preferences;
drop policy if exists "notif_prefs_update_own" on public.notification_preferences;
drop policy if exists "notif_prefs_delete_own" on public.notification_preferences;

create policy "notif_prefs_select_own"
  on public.notification_preferences for select
  using (auth.uid() = user_id);

create policy "notif_prefs_insert_own"
  on public.notification_preferences for insert
  with check (auth.uid() = user_id);

create policy "notif_prefs_update_own"
  on public.notification_preferences for update
  using     (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notif_prefs_delete_own"
  on public.notification_preferences for delete
  using (auth.uid() = user_id);
