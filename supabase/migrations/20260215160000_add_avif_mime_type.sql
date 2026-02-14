-- Add image/avif and image/gif to allowed MIME types for event-covers bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
WHERE id = 'event-covers';

-- Also update user-avatars bucket if it exists
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
WHERE id = 'user-avatars';
