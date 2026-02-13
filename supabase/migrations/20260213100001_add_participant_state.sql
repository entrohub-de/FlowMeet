-- 参与者状态表: 持久化参与者的匹配/流程状态，支持断线恢复
-- 当参与者断线、锁屏或刷新页面后，可以根据此表恢复到正确的状态

-- ============================================================================
-- 1) 创建表
-- ============================================================================
CREATE TABLE public.evt_participant_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flow_step_id VARCHAR(200),
  participant_status VARCHAR(30) NOT NULL DEFAULT 'checkin'
    CHECK (participant_status IN ('checkin', 'waiting', 'ready', 'matched', 'in_conversation', 'feedback')),
  current_match_id UUID REFERENCES public.evt_matches(match_id) ON DELETE SET NULL,
  current_group_id UUID REFERENCES public.evt_groups(group_id) ON DELETE SET NULL,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_participant_per_event UNIQUE (event_id, user_id)
);

-- ============================================================================
-- 2) updated_at 触发器
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_evt_participant_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evt_participant_state_updated_at
  BEFORE UPDATE ON public.evt_participant_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_evt_participant_state_updated_at();

-- ============================================================================
-- 3) RLS 策略
-- ============================================================================
ALTER TABLE public.evt_participant_state ENABLE ROW LEVEL SECURITY;

-- Users can read their own state
CREATE POLICY "Users can read own state" ON public.evt_participant_state
  FOR SELECT USING (auth.uid() = user_id);

-- Users can upsert their own state
CREATE POLICY "Users can upsert own state" ON public.evt_participant_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own state
CREATE POLICY "Users can update own state" ON public.evt_participant_state
  FOR UPDATE USING (auth.uid() = user_id);

-- Host/admin can read all participant states for their events
CREATE POLICY "Host can read event states" ON public.evt_participant_state
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role IN ('host', 'admin')
    )
  );

-- ============================================================================
-- 4) 索引
-- ============================================================================
CREATE INDEX idx_participant_state_event ON public.evt_participant_state(event_id);
CREATE INDEX idx_participant_state_heartbeat ON public.evt_participant_state(last_heartbeat_at);

-- ============================================================================
-- 5) 权限授予
-- ============================================================================
GRANT ALL ON TABLE "public"."evt_participant_state" TO "anon";
GRANT ALL ON TABLE "public"."evt_participant_state" TO "authenticated";
GRANT ALL ON TABLE "public"."evt_participant_state" TO "postgres";
GRANT ALL ON TABLE "public"."evt_participant_state" TO "service_role";
