-- Add interest tracking fields to usr_connections
ALTER TABLE usr_connections
  ADD COLUMN IF NOT EXISTS user1_interested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS user2_interested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mutual_interest_notified_at TIMESTAMPTZ DEFAULT NULL;

-- Index for weekly digest query: find mutual interests not yet notified
CREATE INDEX IF NOT EXISTS idx_usr_connections_mutual_interest
  ON usr_connections(user1_interested, user2_interested)
  WHERE user1_interested = true AND user2_interested = true;

NOTIFY pgrst, 'reload schema';
