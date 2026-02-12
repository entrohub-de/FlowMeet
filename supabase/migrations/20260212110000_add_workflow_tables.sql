-- Workflow module library + event workflow steps
-- Flexible schema: fixed columns + JSONB config payloads

-- ============================================================================
-- 1) workflow_modules: reusable module templates
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_modules (
  module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  module_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  default_duration_minutes INTEGER NOT NULL DEFAULT 15 CHECK (default_duration_minutes > 0),
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT workflow_modules_definition_object CHECK (jsonb_typeof(definition) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_workflow_modules_active_order
  ON public.workflow_modules(is_active, display_order);

-- ============================================================================
-- 2) workflow_event_steps: event-level workflow composition
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workflow_event_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  module_id UUID NOT NULL REFERENCES public.workflow_modules(module_id) ON DELETE RESTRICT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  runtime_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT workflow_event_steps_event_order_unique UNIQUE (event_id, step_order),
  CONSTRAINT workflow_event_steps_runtime_config_object CHECK (jsonb_typeof(runtime_config) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_workflow_event_steps_event
  ON public.workflow_event_steps(event_id);
CREATE INDEX IF NOT EXISTS idx_workflow_event_steps_event_order
  ON public.workflow_event_steps(event_id, step_order);
CREATE INDEX IF NOT EXISTS idx_workflow_event_steps_module
  ON public.workflow_event_steps(module_id);

-- ============================================================================
-- 3) updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_workflow_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_modules_updated_at ON public.workflow_modules;
CREATE TRIGGER workflow_modules_updated_at
  BEFORE UPDATE ON public.workflow_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_modules_updated_at();

CREATE OR REPLACE FUNCTION public.update_workflow_event_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_event_steps_updated_at ON public.workflow_event_steps;
CREATE TRIGGER workflow_event_steps_updated_at
  BEFORE UPDATE ON public.workflow_event_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workflow_event_steps_updated_at();

-- ============================================================================
-- 4) RLS
-- ============================================================================
ALTER TABLE public.workflow_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_event_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workflow_modules_select_active_public" ON public.workflow_modules;
CREATE POLICY "workflow_modules_select_active_public"
  ON public.workflow_modules
  FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "workflow_modules_select_all_host_admin" ON public.workflow_modules;
CREATE POLICY "workflow_modules_select_all_host_admin"
  ON public.workflow_modules
  FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_modules_insert_host_admin" ON public.workflow_modules;
CREATE POLICY "workflow_modules_insert_host_admin"
  ON public.workflow_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_modules_update_host_admin" ON public.workflow_modules;
CREATE POLICY "workflow_modules_update_host_admin"
  ON public.workflow_modules
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_modules_delete_host_admin" ON public.workflow_modules;
CREATE POLICY "workflow_modules_delete_host_admin"
  ON public.workflow_modules
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_event_steps_select_authenticated" ON public.workflow_event_steps;
CREATE POLICY "workflow_event_steps_select_authenticated"
  ON public.workflow_event_steps
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "workflow_event_steps_insert_host_admin" ON public.workflow_event_steps;
CREATE POLICY "workflow_event_steps_insert_host_admin"
  ON public.workflow_event_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_event_steps_update_host_admin" ON public.workflow_event_steps;
CREATE POLICY "workflow_event_steps_update_host_admin"
  ON public.workflow_event_steps
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

DROP POLICY IF EXISTS "workflow_event_steps_delete_host_admin" ON public.workflow_event_steps;
CREATE POLICY "workflow_event_steps_delete_host_admin"
  ON public.workflow_event_steps
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

-- ============================================================================
-- 5) seed default workflow modules
-- ============================================================================
INSERT INTO public.workflow_modules (
  module_key,
  name,
  description,
  module_type,
  default_duration_minutes,
  definition,
  display_order
) VALUES
  (
    'opening_checkin',
    '签到与入场',
    '人员到场、分区指引、暖场准备。',
    'opening',
    20,
    '{"allow_late_join": true}'::jsonb,
    10
  ),
  (
    'opening_intro',
    '开场与规则说明',
    '主持人说明目标、流程与互动规则。',
    'opening',
    10,
    '{"show_agenda": true}'::jsonb,
    20
  ),
  (
    'networking_free_talk',
    '自由交流',
    '开放走动交流，适合快速建立连接。',
    'networking',
    25,
    '{"mode": "open", "need_timer": true}'::jsonb,
    30
  ),
  (
    'group_small_discussion',
    '小组交流',
    '按主题分组讨论，每组输出结论。',
    'group',
    35,
    '{"group_size": 6, "topic_source": "manual"}'::jsonb,
    40
  ),
  (
    'industry_peer_exchange',
    '同行业交流',
    '同赛道交流，聚焦行业资源与合作。',
    'industry',
    30,
    '{"group_by": "industry", "cross_level": false}'::jsonb,
    50
  ),
  (
    'closing_summary_share',
    '总结分享',
    '代表发言与关键收获回顾。',
    'closing',
    15,
    '{"allow_open_mic": true}'::jsonb,
    60
  )
ON CONFLICT (module_key) DO NOTHING;

-- ============================================================================
-- 6) comments
-- ============================================================================
COMMENT ON TABLE public.workflow_modules IS 'Reusable workflow module templates (fixed fields + JSONB definition)';
COMMENT ON TABLE public.workflow_event_steps IS 'Per-event workflow composition steps using selected modules';

COMMENT ON COLUMN public.workflow_modules.definition IS 'Template-level schema for module behavior/fields';
COMMENT ON COLUMN public.workflow_event_steps.runtime_config IS 'Event-level overrides for the selected module';
