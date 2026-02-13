-- Migration: Add area-based location to evt_matches
-- Purpose: Allow users to select a venue area for location sharing after matching
-- Created: 2026-02-15

-- Add area FK columns for structured location selection
ALTER TABLE public.evt_matches
  ADD COLUMN IF NOT EXISTS user1_area_id UUID REFERENCES public.evt_areas(area_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user2_area_id UUID REFERENCES public.evt_areas(area_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.evt_matches.user1_area_id IS 'Area selected by user1 for location sharing';
COMMENT ON COLUMN public.evt_matches.user2_area_id IS 'Area selected by user2 for location sharing';

-- Enable realtime for evt_matches so clients can subscribe to location changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.evt_matches;
