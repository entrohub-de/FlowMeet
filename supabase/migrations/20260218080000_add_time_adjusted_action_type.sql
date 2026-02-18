-- Add 'time_adjusted' to evt_host_actions action_type check constraint
ALTER TABLE public.evt_host_actions
  DROP CONSTRAINT evt_host_actions_action_type_check;

ALTER TABLE public.evt_host_actions
  ADD CONSTRAINT evt_host_actions_action_type_check
  CHECK (action_type IN (
    'flow_applied', 'step_started', 'step_paused', 'step_resumed', 'step_completed',
    'flow_paused', 'flow_resumed', 'flow_completed', 'flow_reset',
    'matching_triggered', 'grouping_triggered',
    'manual_pair', 'manual_unpair', 'manual_regroup',
    'global_pause', 'global_resume',
    'time_adjusted'
  ));
