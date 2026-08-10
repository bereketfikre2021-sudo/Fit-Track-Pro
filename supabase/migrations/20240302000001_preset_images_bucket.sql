-- Create the app-assets storage bucket for preset thumbnails
-- (safe to run multiple times — INSERT ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  true,
  5242880,  -- 5 MB limit per file
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/update/delete in app-assets
CREATE POLICY IF NOT EXISTS "Authenticated upload to app-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-assets');

CREATE POLICY IF NOT EXISTS "Authenticated update app-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-assets');

CREATE POLICY IF NOT EXISTS "Public read app-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'app-assets');
