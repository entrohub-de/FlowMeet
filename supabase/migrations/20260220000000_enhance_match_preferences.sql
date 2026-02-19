ALTER TABLE public.match_preferences
ADD COLUMN IF NOT EXISTS preferred_topics_tags text[] DEFAULT '{}';
