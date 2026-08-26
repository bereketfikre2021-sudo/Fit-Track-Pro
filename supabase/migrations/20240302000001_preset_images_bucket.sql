-- Create or update the app-assets storage bucket
-- Uses upsert so re-running always applies the latest mime type list and size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-assets',
  'app-assets',
  true,
  10485760,  -- 10 MB limit per file (raised to accommodate GIFs)
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
    'image/avif',
    'image/tiff',
    'image/bmp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Drop old policies (any name variant) so we can recreate cleanly ───────────
DROP POLICY IF EXISTS "Authenticated upload to app-assets"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update app-assets"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete app-assets"     ON storage.objects;
DROP POLICY IF EXISTS "Public read app-assets"              ON storage.objects;
-- Also drop any IF NOT EXISTS variants that may have been created with broken syntax
DROP POLICY IF EXISTS "Allow authenticated uploads"         ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates"         ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads"                  ON storage.objects;

-- ── Recreate policies cleanly ─────────────────────────────────────────────────

-- Authenticated users can INSERT objects into app-assets
CREATE POLICY "Authenticated upload to app-assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-assets');

-- Authenticated users can UPDATE (overwrite) objects in app-assets
CREATE POLICY "Authenticated update app-assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-assets')
  WITH CHECK (bucket_id = 'app-assets');

-- Authenticated users can DELETE objects from app-assets
CREATE POLICY "Authenticated delete app-assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-assets');

-- Public (anon + authenticated) can read objects from app-assets
CREATE POLICY "Public read app-assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'app-assets');
