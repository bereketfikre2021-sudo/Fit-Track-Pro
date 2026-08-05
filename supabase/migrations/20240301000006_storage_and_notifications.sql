-- ============================================================
--  Migration: Storage Metadata, Notifications
-- ============================================================

-- ── storage_metadata ──────────────────────────────────────────────────────────
create type public.storage_bucket_name as enum ('avatars','progress_photos','exercise_media','meal_photos','exports','reports');

create table if not exists public.storage_metadata (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bucket          public.storage_bucket_name not null,
  storage_path    text not null unique,
  original_name   text,
  mime_type       text,
  size_bytes      bigint,
  width_px        integer,
  height_px       integer,
  duration_sec    numeric(8,2),          -- for video files
  is_processed    boolean not null default false,
  processing_error text,
  metadata        jsonb default '{}',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.storage_metadata is 'Tracks all files stored in Supabase Storage buckets.';
create index idx_storage_meta_user_id  on public.storage_metadata(user_id);
create index idx_storage_meta_bucket   on public.storage_metadata(bucket);
create index idx_storage_meta_path     on public.storage_metadata(storage_path);
create index idx_storage_meta_deleted  on public.storage_metadata(deleted_at) where deleted_at is null;

alter table public.storage_metadata enable row level security;
create policy "Users manage own storage metadata" on public.storage_metadata for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all storage metadata"  on public.storage_metadata for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── Supabase Storage bucket policies (run in SQL editor after creating buckets)
-- Run these manually after creating the buckets in Storage dashboard:
--
-- create policy "Users upload own avatars"
--   on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Avatars publicly readable"
--   on storage.objects for select using (bucket_id = 'avatars');
-- create policy "Users manage own progress photos"
--   on storage.objects for all using (bucket_id = 'progress_photos' and auth.uid()::text = (storage.foldername(name))[1]);
-- create policy "Users manage own exports"
--   on storage.objects for all using (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── notifications (extended from notification_preferences) ────────────────────
create type public.notification_channel  as enum ('push','email','in_app','sms');
create type public.notification_priority as enum ('low','normal','high','urgent');

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  body            text not null,
  channel         public.notification_channel not null default 'in_app',
  priority        public.notification_priority not null default 'normal',
  category        text,    -- 'workout_reminder','meal_reminder','achievement','system','promo'
  data            jsonb default '{}',
  is_read         boolean not null default false,
  read_at         timestamptz,
  sent_at         timestamptz,
  failed_at       timestamptz,
  failure_reason  text,
  expires_at      timestamptz,
  action_url      text,
  created_at      timestamptz not null default now()
);

comment on table public.notifications is 'In-app and push notification log.';
create index idx_notifications_user_id    on public.notifications(user_id);
create index idx_notifications_is_read    on public.notifications(user_id, is_read) where is_read = false;
create index idx_notifications_created_at on public.notifications(created_at desc);
create index idx_notifications_category   on public.notifications(category);

alter table public.notifications enable row level security;
create policy "Users read own notifications"   on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "System inserts notifications"   on public.notifications for insert with check (true);
create policy "Admins read all notifications"  on public.notifications for select using (exists (select 1 from public.user_roles r where r.user_id = auth.uid() and r.role in ('admin','super_admin')));

-- ── Function: mark notification as read ──────────────────────────────────────
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where id = p_notification_id and user_id = auth.uid();
end;
$$;

-- ── Function: mark all notifications read ────────────────────────────────────
create or replace function public.mark_all_notifications_read()
returns integer language plpgsql security definer as $$
declare v_count integer;
begin
  update public.notifications set is_read = true, read_at = now()
  where user_id = auth.uid() and is_read = false;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── View: unread notification counts ─────────────────────────────────────────
create or replace view public.v_unread_notifications as
select
  user_id,
  count(*) as unread_count,
  max(created_at) as latest_at
from public.notifications
where is_read = false
  and (expires_at is null or expires_at > now())
group by user_id;
