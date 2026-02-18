-- Add networking_intent column to match_preferences table
-- Stores the user's primary goal for this event (e.g., find_cofounder, learn_exchange, etc.)
ALTER TABLE match_preferences
  ADD COLUMN IF NOT EXISTS networking_intent text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN match_preferences.networking_intent IS 'User primary networking goal for this event: find_cofounder, learn_exchange, expand_network, get_inspiration';
