-- ============================================================
-- Aspire World Content Studio — Storage Bucket & Policies Migration
-- ============================================================

-- 1. Create content-assets storage bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-assets',
  'content-assets',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'application/pdf',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  public = false;

-- 2. Storage Policies for content-assets bucket
-- Drop existing policies if any to prevent conflicts
DROP POLICY IF EXISTS "Authenticated users can read content-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and editors can upload content-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins and editors can update content-assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete content-assets" ON storage.objects;

-- SELECT policy: Any authenticated user (including reviewers) can view / download
CREATE POLICY "Authenticated users can read content-assets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'content-assets');

-- INSERT policy: Admins and editors can upload files
CREATE POLICY "Admins and editors can upload content-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-assets'
  AND (public.user_role() IN ('admin', 'editor'))
);

-- UPDATE policy: Admins and editors can update existing files
CREATE POLICY "Admins and editors can update content-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-assets'
  AND (public.user_role() IN ('admin', 'editor'))
);

-- DELETE policy: Admins only can delete files
CREATE POLICY "Admins can delete content-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-assets'
  AND (public.user_role() = 'admin')
);
