-- Create storage bucket for ad images (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-images',
  'ad-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload ad images
CREATE POLICY "Allow ad image uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ad-images');

-- Allow authenticated users to update ad images
CREATE POLICY "Allow ad image updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'ad-images');

-- Allow authenticated users to delete ad images
CREATE POLICY "Allow ad image deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ad-images');

-- Allow public read access (bucket is public)
CREATE POLICY "Allow public ad image read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ad-images');
