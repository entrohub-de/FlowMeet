-- Add permissions column to session_active_flows
ALTER TABLE session_active_flows
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"matching_1v1_enabled": false, "matching_group_enabled": false}'::jsonb;

-- Add autoAdvance to steps (stored in steps JSONB array, no schema change needed)
COMMENT ON COLUMN session_active_flows.permissions IS 'Host permission toggles: matching_1v1_enabled, matching_group_enabled, group_size';
