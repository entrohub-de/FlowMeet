-- Workflow templates for hosts (persisted in DB)

CREATE TABLE IF NOT EXISTS public.workflow_templates (
  template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT workflow_templates_steps_array CHECK (jsonb_typeof(steps) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_event
  ON public.workflow_templates(event_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_workflow_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_templates_updated_at ON public.workflow_templates;
CREATE TRIGGER workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_templates_updated_at();

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_templates_select_host_admin" ON public.workflow_templates;
CREATE POLICY "workflow_templates_select_host_admin"
  ON public.workflow_templates
  FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_templates_insert_host_admin" ON public.workflow_templates;
CREATE POLICY "workflow_templates_insert_host_admin"
  ON public.workflow_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_templates_update_host_admin" ON public.workflow_templates;
CREATE POLICY "workflow_templates_update_host_admin"
  ON public.workflow_templates
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_templates_delete_host_admin" ON public.workflow_templates;
CREATE POLICY "workflow_templates_delete_host_admin"
  ON public.workflow_templates
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

COMMENT ON TABLE public.workflow_templates IS 'Host-defined workflow templates per event';
COMMENT ON COLUMN public.workflow_templates.steps IS 'Array of WorkflowStepConfig JSON objects';
