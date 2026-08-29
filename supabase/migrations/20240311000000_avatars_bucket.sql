-- ============================================================
--  Migration: Avatars Storage Bucket
--  Creates the 'avatars' public bucket for profile pictures.
--  Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING.
-- ============================================================

-- ── Create bucket ─────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,   -- public: avatar URLs are safe to expose (no PII beyond the image)
  2097152, -- 2 MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage policies ─────────────────────────────────────────────────────────

-- Users can upload / update / delete their own avatar
-- Path format: {user_id}/avatar.jpg  (foldername[1] = user_id)
DROP POLICY IF EXISTS "Users upload own avatars"  ON storage.objects;
CREATE POLICY "Users upload own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own avatars"  ON storage.objects;
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own avatars"  ON storage.objects;
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Everyone can read avatars (bucket is public, but belt-and-suspenders)
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
CREATE POLICY "Avatars publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
