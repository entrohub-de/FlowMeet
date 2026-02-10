-- Rating Tables for FlowMeet
-- Allows users to rate: events, matches, match quality, and topics

-- ============================================================================
-- 1. EVENT RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evt_event_ratings (
  rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating scores (1-5 stars each)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 1 AND overall_score <= 5),
  organization_score INTEGER CHECK (organization_score >= 1 AND organization_score <= 5),
  venue_score INTEGER CHECK (venue_score >= 1 AND venue_score <= 5),

  -- Optional text feedback
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One rating per user per event
  CONSTRAINT evt_event_ratings_unique UNIQUE (event_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_evt_event_ratings_event
  ON public.evt_event_ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_event_ratings_user
  ON public.evt_event_ratings(user_id);

-- ============================================================================
-- 2. MATCH PARTNER RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evt_match_ratings (
  rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.evt_matches(match_id) ON DELETE CASCADE,
  rater_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating (1-5 stars)
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),

  -- Optional feedback
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One rating per rater per match
  CONSTRAINT evt_match_ratings_unique UNIQUE (match_id, rater_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evt_match_ratings_match
  ON public.evt_match_ratings(match_id);
CREATE INDEX IF NOT EXISTS idx_evt_match_ratings_rater
  ON public.evt_match_ratings(rater_user_id);

-- ============================================================================
-- 3. MATCH QUALITY RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evt_match_quality_ratings (
  rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating (1-5 stars)
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),

  -- Optional feedback
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One match quality rating per user per event
  CONSTRAINT evt_match_quality_ratings_unique UNIQUE (event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evt_match_quality_ratings_event
  ON public.evt_match_quality_ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_match_quality_ratings_user
  ON public.evt_match_quality_ratings(user_id);

-- ============================================================================
-- 4. TOPIC QUALITY RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evt_topic_ratings (
  rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.evt_conversation_topics(topic_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating (1-5 stars)
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),

  -- Optional feedback
  comment TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One rating per user per topic
  CONSTRAINT evt_topic_ratings_unique UNIQUE (topic_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evt_topic_ratings_topic
  ON public.evt_topic_ratings(topic_id);
CREATE INDEX IF NOT EXISTS idx_evt_topic_ratings_user
  ON public.evt_topic_ratings(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all rating tables
ALTER TABLE public.evt_event_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_match_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_match_quality_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_topic_ratings ENABLE ROW LEVEL SECURITY;

-- Event Ratings Policies
CREATE POLICY "Users can view their own event ratings"
  ON public.evt_event_ratings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own event ratings"
  ON public.evt_event_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own event ratings"
  ON public.evt_event_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own event ratings"
  ON public.evt_event_ratings FOR DELETE
  USING (user_id = auth.uid());

-- Match Ratings Policies
CREATE POLICY "Users can view their own match ratings"
  ON public.evt_match_ratings FOR SELECT
  USING (rater_user_id = auth.uid());

CREATE POLICY "Users can insert their own match ratings"
  ON public.evt_match_ratings FOR INSERT
  WITH CHECK (rater_user_id = auth.uid());

CREATE POLICY "Users can update their own match ratings"
  ON public.evt_match_ratings FOR UPDATE
  USING (rater_user_id = auth.uid());

CREATE POLICY "Users can delete their own match ratings"
  ON public.evt_match_ratings FOR DELETE
  USING (rater_user_id = auth.uid());

-- Match Quality Ratings Policies
CREATE POLICY "Users can view their own match quality ratings"
  ON public.evt_match_quality_ratings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own match quality ratings"
  ON public.evt_match_quality_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own match quality ratings"
  ON public.evt_match_quality_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own match quality ratings"
  ON public.evt_match_quality_ratings FOR DELETE
  USING (user_id = auth.uid());

-- Topic Ratings Policies
CREATE POLICY "Users can view their own topic ratings"
  ON public.evt_topic_ratings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own topic ratings"
  ON public.evt_topic_ratings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own topic ratings"
  ON public.evt_topic_ratings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own topic ratings"
  ON public.evt_topic_ratings FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.evt_event_ratings IS 'User ratings for overall event experience';
COMMENT ON TABLE public.evt_match_ratings IS 'User ratings for individual match partners';
COMMENT ON TABLE public.evt_match_quality_ratings IS 'User ratings for matching algorithm quality';
COMMENT ON TABLE public.evt_topic_ratings IS 'User ratings for AI-generated conversation topics';

COMMENT ON COLUMN public.evt_event_ratings.overall_score IS 'Overall event experience (1-5 stars)';
COMMENT ON COLUMN public.evt_event_ratings.organization_score IS 'Event organization quality (1-5 stars)';
COMMENT ON COLUMN public.evt_event_ratings.venue_score IS 'Venue quality (1-5 stars)';

COMMENT ON COLUMN public.evt_match_ratings.score IS 'Match partner rating (1-5 stars)';
COMMENT ON COLUMN public.evt_match_quality_ratings.score IS 'Match algorithm quality (1-5 stars)';
COMMENT ON COLUMN public.evt_topic_ratings.score IS 'Topic quality rating (1-5 stars)';
