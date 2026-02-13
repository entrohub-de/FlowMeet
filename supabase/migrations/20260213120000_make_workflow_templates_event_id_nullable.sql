-- Make workflow_templates.event_id nullable so templates are shared across all events

ALTER TABLE public.workflow_templates
  ALTER COLUMN event_id DROP NOT NULL;

COMMENT ON TABLE public.workflow_templates IS 'Host-defined workflow templates, shared across all events';
