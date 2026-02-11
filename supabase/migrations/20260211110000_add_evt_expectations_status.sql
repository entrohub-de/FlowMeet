-- Add status column to evt_expectations table
-- This allows soft deletion of expectations instead of hard deletion

-- Add status column with default value 'active'
ALTER TABLE evt_expectations
ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Add check constraint to ensure status is either 'active' or 'deleted'
ALTER TABLE evt_expectations
ADD CONSTRAINT evt_expectations_status_check
CHECK (status IN ('active', 'deleted'));

-- Create index on status column for better query performance
CREATE INDEX idx_evt_expectations_status ON evt_expectations(status);

-- Update existing records to have 'active' status
UPDATE evt_expectations SET status = 'active' WHERE status IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN evt_expectations.status IS 'Status of the expectation: active or deleted (soft delete)';
