-- Add status column to evt_events
-- Values: 'active' (default), 'cancelled', 'passed'
ALTER TABLE evt_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'cancelled', 'passed'));

-- Mark existing past events as 'passed' based on end_time
UPDATE evt_events
  SET status = 'passed'
  WHERE end_time < now() AND status = 'active';

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_evt_events_status ON evt_events (status);
