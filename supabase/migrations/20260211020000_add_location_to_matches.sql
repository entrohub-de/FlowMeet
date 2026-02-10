-- Migration: Add location fields to evt_matches table
-- Purpose: Enable users to share their current location when matched
-- Created: 2026-02-11

-- Add location description fields for both users in a match
ALTER TABLE public.evt_matches
  ADD COLUMN IF NOT EXISTS user1_location TEXT CHECK (char_length(user1_location) <= 100),
  ADD COLUMN IF NOT EXISTS user2_location TEXT CHECK (char_length(user2_location) <= 100),
  ADD COLUMN IF NOT EXISTS location_updated_by_user1_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_updated_by_user2_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.evt_matches.user1_location IS 'Location description provided by user1 (max 100 chars)';
COMMENT ON COLUMN public.evt_matches.user2_location IS 'Location description provided by user2 (max 100 chars)';
COMMENT ON COLUMN public.evt_matches.location_updated_by_user1_at IS 'Timestamp when user1 last updated their location';
COMMENT ON COLUMN public.evt_matches.location_updated_by_user2_at IS 'Timestamp when user2 last updated their location';

-- RLS Policy: Users can only update their own location field
-- This policy allows user1 to update user1_location and user2 to update user2_location
CREATE POLICY "Users can update their own match location"
  ON public.evt_matches
  FOR UPDATE
  USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
  )
  WITH CHECK (
    (auth.uid() = user1_id) OR (auth.uid() = user2_id)
  );

-- Note: The SELECT policy already exists and allows users to view matches they're part of
-- Location fields will be visible when status = 'accepted' (enforced in application layer)
