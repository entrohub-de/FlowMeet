-- Create matches table (using evt_ prefix for consistency)
CREATE TABLE IF NOT EXISTS public.evt_matches (
  match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_match UNIQUE (event_id, user1_id, user2_id),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Create match_preferences table (using evt_ prefix for consistency)
CREATE TABLE IF NOT EXISTS public.evt_match_preferences (
  preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_topics TEXT,
  availability TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_preference UNIQUE (event_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evt_matches_event_id ON public.evt_matches(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_matches_user1_id ON public.evt_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_evt_matches_user2_id ON public.evt_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_evt_matches_status ON public.evt_matches(status);
CREATE INDEX IF NOT EXISTS idx_evt_match_preferences_event_id ON public.evt_match_preferences(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_match_preferences_user_id ON public.evt_match_preferences(user_id);

-- Enable RLS
ALTER TABLE public.evt_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_match_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evt_matches table
-- Users can view matches they are part of
CREATE POLICY "Users can view their own matches"
  ON public.evt_matches
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create matches where they are user1
CREATE POLICY "Users can create matches"
  ON public.evt_matches
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id);

-- Users can update matches where they are involved
CREATE POLICY "Users can update their matches"
  ON public.evt_matches
  FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS Policies for evt_match_preferences table
-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
  ON public.evt_match_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
  ON public.evt_match_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
  ON public.evt_match_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences"
  ON public.evt_match_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for evt_matches
CREATE OR REPLACE FUNCTION update_evt_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evt_matches_updated_at
  BEFORE UPDATE ON public.evt_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_matches_updated_at();

-- Add updated_at trigger for evt_match_preferences
CREATE OR REPLACE FUNCTION update_evt_match_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evt_match_preferences_updated_at
  BEFORE UPDATE ON public.evt_match_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_evt_match_preferences_updated_at();
