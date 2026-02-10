-- Create conversation topics table
CREATE TABLE IF NOT EXISTS public.evt_conversation_topics (
  topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.evt_matches(match_id) ON DELETE CASCADE,
  topics JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_match FOREIGN KEY (match_id) REFERENCES public.evt_matches(match_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_evt_conversation_topics_match_id
  ON public.evt_conversation_topics(match_id);

CREATE INDEX IF NOT EXISTS idx_evt_conversation_topics_generated_at
  ON public.evt_conversation_topics(generated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.evt_conversation_topics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view topics for their matches
CREATE POLICY "Users can view topics for their matches"
  ON public.evt_conversation_topics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.evt_matches m
      WHERE m.match_id = evt_conversation_topics.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- RLS Policy: System can insert topics (via Edge Function)
CREATE POLICY "Edge Function can insert topics"
  ON public.evt_conversation_topics
  FOR INSERT
  WITH CHECK (true);

-- Rate limiting function: Check if user can generate topics for a match
CREATE OR REPLACE FUNCTION public.can_generate_topics(p_match_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow generation if no topics exist for this match in the last hour
  RETURN NOT EXISTS (
    SELECT 1 FROM public.evt_conversation_topics
    WHERE match_id = p_match_id
    AND generated_at > NOW() - INTERVAL '1 hour'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.can_generate_topics(UUID) TO authenticated;

-- Comment on table
COMMENT ON TABLE public.evt_conversation_topics IS 'Stores AI-generated conversation topics for matched users';
COMMENT ON COLUMN public.evt_conversation_topics.topics IS 'JSONB array of topic objects with category, question, and reasoning';
COMMENT ON FUNCTION public.can_generate_topics IS 'Rate limiting: Returns true if topics can be generated (1 per match per hour)';
