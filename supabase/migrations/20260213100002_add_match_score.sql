-- Add match score and reasons to evt_matches for quality tracking
ALTER TABLE public.evt_matches ADD COLUMN IF NOT EXISTS match_score INTEGER;
ALTER TABLE public.evt_matches ADD COLUMN IF NOT EXISTS match_reasons TEXT[];
