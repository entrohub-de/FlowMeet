-- session_active_module: 记录每次模块/步骤的执行实例
-- 每次 host 触发匹配就是一个新的 module 执行记录，用于追踪轮次、统计数据

-- ============================================================================
-- 1) 创建表
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.session_active_module (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  step_id VARCHAR(200) NOT NULL,          -- 对应 session_active_flows.active_step_id
  module_type VARCHAR(50) NOT NULL,       -- '1v1', 'group', 'networking' 等
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  round_number INTEGER NOT NULL DEFAULT 1,
  ready_count INTEGER NOT NULL DEFAULT 0,
  paired_count INTEGER NOT NULL DEFAULT 0,
  unpaired_user_ids UUID[] DEFAULT '{}',
  avg_match_score INTEGER,                -- 平均匹配分数 0-100
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT session_active_module_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

-- 索引: 按活动+步骤查询，按活动查询
CREATE INDEX idx_session_active_module_event_step
  ON public.session_active_module(event_id, step_id);
CREATE INDEX idx_session_active_module_event
  ON public.session_active_module(event_id);

-- ============================================================================
-- 2) evt_matches 添加 active_module_id 外键，关联匹配到具体执行轮次
-- ============================================================================
ALTER TABLE public.evt_matches
  ADD COLUMN IF NOT EXISTS active_module_id UUID
    REFERENCES public.session_active_module(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_evt_matches_active_module
  ON public.evt_matches(active_module_id);

-- ============================================================================
-- 3) updated_at 触发器
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_session_active_module_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_active_module_updated_at
  BEFORE UPDATE ON public.session_active_module
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_active_module_updated_at();

-- ============================================================================
-- 4) RLS 策略
-- ============================================================================
ALTER TABLE public.session_active_module ENABLE ROW LEVEL SECURITY;

-- 所有已认证用户可读（参与者需要查看当前模块状态）
CREATE POLICY "session_active_module_select_authenticated"
  ON public.session_active_module
  FOR SELECT
  TO authenticated
  USING (true);

-- 仅 host/admin 可写入
CREATE POLICY "session_active_module_insert_host_admin"
  ON public.session_active_module
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

CREATE POLICY "session_active_module_update_host_admin"
  ON public.session_active_module
  FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

CREATE POLICY "session_active_module_delete_host_admin"
  ON public.session_active_module
  FOR DELETE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));

-- ============================================================================
-- 5) 权限授予
-- ============================================================================
GRANT ALL ON TABLE "public"."session_active_module" TO "anon";
GRANT ALL ON TABLE "public"."session_active_module" TO "authenticated";
GRANT ALL ON TABLE "public"."session_active_module" TO "postgres";
GRANT ALL ON TABLE "public"."session_active_module" TO "service_role";

-- ============================================================================
-- 6) 注释
-- ============================================================================
COMMENT ON TABLE public.session_active_module IS '每次模块执行的实例记录，追踪匹配轮次、参与人数和统计数据';
COMMENT ON COLUMN public.session_active_module.step_id IS '对应 session_active_flows 中的 active_step_id';
COMMENT ON COLUMN public.session_active_module.round_number IS '同一步骤内的第几轮执行';
COMMENT ON COLUMN public.evt_matches.active_module_id IS '该匹配所属的模块执行轮次';
