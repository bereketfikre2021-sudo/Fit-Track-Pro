-- ============================================================
--  Migration: Ensure progress_photos storage bucket exists
--  Safe to re-run — all statements are idempotent.
-- ============================================================

-- ── 1. Create the bucket if it doesn't exist ──────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress_photos',
  'progress_photos',
  false,          -- private: access only via signed URLs
  10485760,       -- 10 MB per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 2. RLS policies on storage.objects ───────────────────────────────────────
--  Drop first so the migration is safe to re-run (CREATE POLICY has no IF NOT EXISTS
--  in older Postgres/Supabase versions).

drop policy if exists "Users upload own progress photos"  on storage.objects;
drop policy if exists "Users read own progress photos"    on storage.objects;
drop policy if exists "Users delete own progress photos"  on storage.objects;

-- Users may only INSERT objects whose first path segment matches their own uid.
create policy "Users upload own progress photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may only SELECT (create signed URLs for) their own objects.
create policy "Users read own progress photos"
  on storage.objects
  for select
  using (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may only DELETE their own objects.
create policy "Users delete own progress photos"
  on storage.objects
  for delete
  using (
    bucket_id = 'progress_photos'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 3. Ensure progress_photos table exists (idempotent) ───────────────────────
create table if not exists public.progress_photos (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  storage_path    text        not null,
  taken_at        date        not null default current_date,
  weight_kg       numeric(5,1),
  bmi             numeric(4,1),
  note            text,
  notes           text,       -- actual column name (note is a legacy alias)
  is_private      boolean     not null default true,
  created_at      timestamptz not null default now()
);

-- Ensure index exists
create index if not exists idx_progress_photos_user
  on public.progress_photos(user_id, taken_at desc);

-- Enable RLS (safe to call even if already enabled)
alter table public.progress_photos enable row level security;

drop policy if exists "Users manage own progress photos" on public.progress_photos;
create policy "Users manage own progress photos"
  on public.progress_photos
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
