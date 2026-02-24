-- ============================================================================
-- usr_connections: 独立连接表，支持跨活动的社交关系沉淀
-- 从 match_records 间接连接模式 → 独立连接实体
-- ============================================================================

-- 1) 创建 usr_connections 表
CREATE TABLE IF NOT EXISTS public.usr_connections (
  connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_event_id UUID REFERENCES public.evt_events(event_id) ON DELETE SET NULL,
  source_match_id UUID REFERENCES public.match_records(match_id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user1_note TEXT,
  user2_note TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- user1_id < user2_id 保证同一对用户只有一条记录（规范化方向）
  CONSTRAINT usr_connections_different_users CHECK (user1_id != user2_id),
  CONSTRAINT usr_connections_ordered_users CHECK (user1_id < user2_id),
  CONSTRAINT usr_connections_unique_pair UNIQUE (user1_id, user2_id)
);

-- 2) 索引
CREATE INDEX IF NOT EXISTS idx_usr_connections_user1 ON public.usr_connections(user1_id);
CREATE INDEX IF NOT EXISTS idx_usr_connections_user2 ON public.usr_connections(user2_id);
CREATE INDEX IF NOT EXISTS idx_usr_connections_status ON public.usr_connections(status);
CREATE INDEX IF NOT EXISTS idx_usr_connections_source_event ON public.usr_connections(source_event_id);

-- 3) updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_usr_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usr_connections_updated_at
  BEFORE UPDATE ON public.usr_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_usr_connections_updated_at();

-- 4) connected_at 自动填充：status 变为 accepted 时设置
CREATE OR REPLACE FUNCTION set_usr_connections_connected_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    NEW.connected_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usr_connections_set_connected_at
  BEFORE UPDATE ON public.usr_connections
  FOR EACH ROW
  EXECUTE FUNCTION set_usr_connections_connected_at();

-- 5) RLS 策略
ALTER TABLE public.usr_connections ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己参与的连接
CREATE POLICY "Users can view own connections"
  ON public.usr_connections
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 用户可以创建连接请求（必须是其中一方）
CREATE POLICY "Users can create connection requests"
  ON public.usr_connections
  FOR INSERT
  WITH CHECK (auth.uid() = requested_by AND (auth.uid() = user1_id OR auth.uid() = user2_id));

-- 用户可以更新自己参与的连接（接受/拒绝、修改备注）
CREATE POLICY "Users can update own connections"
  ON public.usr_connections
  FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Host/Admin 可以查看所有连接（用于管理后台）
CREATE POLICY "Hosts can view all connections"
  ON public.usr_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE user_id = auth.uid() AND role IN ('host', 'admin')
    )
  );

-- 6) 从现有 match_records 迁移已确认的连接
-- 将 accepted/completed 的 match 转换为 accepted 连接
INSERT INTO public.usr_connections (user1_id, user2_id, source_event_id, source_match_id, status, requested_by, connected_at, created_at)
SELECT DISTINCT ON (LEAST(m.user1_id, m.user2_id), GREATEST(m.user1_id, m.user2_id))
  LEAST(m.user1_id, m.user2_id) AS user1_id,
  GREATEST(m.user1_id, m.user2_id) AS user2_id,
  m.event_id AS source_event_id,
  m.match_id AS source_match_id,
  'accepted' AS status,
  m.user1_id AS requested_by,
  COALESCE(m.updated_at, m.created_at) AS connected_at,
  m.created_at
FROM public.match_records m
WHERE m.status IN ('accepted', 'completed')
ORDER BY LEAST(m.user1_id, m.user2_id), GREATEST(m.user1_id, m.user2_id), m.created_at ASC
ON CONFLICT (user1_id, user2_id) DO NOTHING;
