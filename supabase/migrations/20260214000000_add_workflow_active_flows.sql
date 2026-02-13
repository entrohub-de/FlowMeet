-- 实时流程状态表: 每个活动一行，记录当前流程执行状态
-- 用于主持人控制流程时持久化状态，并支持参与者实时查看

-- ============================================================================
-- 1) 创建表
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.session_active_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workflow_templates(template_id) ON DELETE SET NULL,
  template_name VARCHAR(120) NOT NULL DEFAULT '',
  flow_status VARCHAR(20) NOT NULL DEFAULT 'idle'
    CHECK (flow_status IN ('idle', 'running', 'paused', 'completed')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_step_id VARCHAR(200),
  active_step_started_at TIMESTAMP WITH TIME ZONE,
  active_step_remaining_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT session_active_flows_steps_array CHECK (jsonb_typeof(steps) = 'array')
);

-- 每个活动只能有一个活跃流程
CREATE UNIQUE INDEX idx_session_active_flows_event
  ON public.session_active_flows(event_id);

-- ============================================================================
-- 2) updated_at 触发器
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_session_active_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_active_flows_updated_at
  BEFORE UPDATE ON public.session_active_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_active_flows_updated_at();

-- ============================================================================
-- 3) RLS 策略
-- ============================================================================
ALTER TABLE public.session_active_flows ENABLE ROW LEVEL SECURITY;

-- 所有已认证用户可读（参与者需要查看流程状态）
CREATE POLICY "session_active_flows_select_authenticated"
  ON public.session_active_flows
  FOR SELECT
  TO authenticated
  USING (true);

-- 仅 host/admin 可写入
CREATE POLICY "session_active_flows_insert_host_admin"
  ON public.session_active_flows
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

CREATE POLICY "session_active_flows_update_host_admin"
  ON public.session_active_flows
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

CREATE POLICY "session_active_flows_delete_host_admin"
  ON public.session_active_flows
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

-- ============================================================================
-- 4) 权限授予
-- ============================================================================
GRANT ALL ON TABLE "public"."session_active_flows" TO "anon";
GRANT ALL ON TABLE "public"."session_active_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."session_active_flows" TO "postgres";
GRANT ALL ON TABLE "public"."session_active_flows" TO "service_role";
