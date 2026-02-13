-- D1: Add global pause support to session_active_flows
ALTER TABLE public.session_active_flows ADD COLUMN IF NOT EXISTS is_globally_paused BOOLEAN DEFAULT false;
ALTER TABLE public.session_active_flows ADD COLUMN IF NOT EXISTS global_pause_message TEXT;
