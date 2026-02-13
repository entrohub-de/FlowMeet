-- Host action audit log table
CREATE TABLE public.evt_host_actions (
  action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'flow_applied', 'step_started', 'step_paused', 'step_resumed', 'step_completed',
    'flow_paused', 'flow_resumed', 'flow_completed', 'flow_reset',
    'matching_triggered', 'grouping_triggered',
    'manual_pair', 'manual_unpair', 'manual_regroup',
    'global_pause', 'global_resume'
  )),
  target_step_id VARCHAR(200),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_host_actions_event ON public.evt_host_actions(event_id, created_at);

ALTER TABLE public.evt_host_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host can insert own actions" ON public.evt_host_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role IN ('host', 'admin')
    )
  );

CREATE POLICY "Host can read event actions" ON public.evt_host_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role IN ('host', 'admin')
    )
  );
