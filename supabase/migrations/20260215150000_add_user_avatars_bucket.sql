-- Create storage bucket for user avatars (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload avatars
CREATE POLICY "Allow avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

-- Allow authenticated users to update their avatars
CREATE POLICY "Allow avatar updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

-- Allow authenticated users to delete their avatars
CREATE POLICY "Allow avatar deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

-- Allow public read access (bucket is public)
CREATE POLICY "Allow public avatar read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');
