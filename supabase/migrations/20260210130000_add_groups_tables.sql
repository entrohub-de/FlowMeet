-- 创建小组表
CREATE TABLE IF NOT EXISTS public.evt_groups (
  group_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.evt_events(event_id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.evt_sessions(session_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  max_size INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建小组成员表
CREATE TABLE IF NOT EXISTS public.evt_group_members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.evt_groups(group_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_evt_groups_event_id ON public.evt_groups(event_id);
CREATE INDEX IF NOT EXISTS idx_evt_groups_session_id ON public.evt_groups(session_id);
CREATE INDEX IF NOT EXISTS idx_evt_group_members_group_id ON public.evt_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_evt_group_members_user_id ON public.evt_group_members(user_id);

-- 启用 RLS
ALTER TABLE public.evt_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evt_group_members ENABLE ROW LEVEL SECURITY;

-- 设置 RLS 策略（允许公开读取）
CREATE POLICY "Allow public read groups" ON public.evt_groups
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated insert groups" ON public.evt_groups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update groups" ON public.evt_groups
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow public read group members" ON public.evt_group_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow authenticated insert group members" ON public.evt_group_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated delete group members" ON public.evt_group_members
  FOR DELETE TO authenticated USING (true);
