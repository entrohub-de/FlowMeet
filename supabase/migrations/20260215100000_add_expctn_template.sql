-- 创建期待模板表
-- 将模板从 localStorage 迁移到数据库，支持跨设备同步
CREATE TABLE IF NOT EXISTS public.expctn_template (
  template_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT expctn_template_pkey PRIMARY KEY (template_id),
  CONSTRAINT expctn_template_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_expctn_template_user_id ON public.expctn_template (user_id);

-- 启用 RLS
ALTER TABLE public.expctn_template ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己的模板
CREATE POLICY "Users can read own templates"
  ON public.expctn_template
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 策略：用户只能创建自己的模板
CREATE POLICY "Users can insert own templates"
  ON public.expctn_template
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能更新自己的模板
CREATE POLICY "Users can update own templates"
  ON public.expctn_template
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS 策略：用户只能删除自己的模板
CREATE POLICY "Users can delete own templates"
  ON public.expctn_template
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 授予权限
GRANT ALL ON TABLE public.expctn_template TO authenticated;
GRANT ALL ON TABLE public.expctn_template TO service_role;

-- 注释
COMMENT ON TABLE public.expctn_template IS '用户的期待模板，可跨活动复用';
COMMENT ON COLUMN public.expctn_template.template_id IS '模板ID';
COMMENT ON COLUMN public.expctn_template.user_id IS '用户ID';
COMMENT ON COLUMN public.expctn_template.name IS '模板名称';
COMMENT ON COLUMN public.expctn_template.tags IS '标签数组（JSON）';
COMMENT ON COLUMN public.expctn_template.text IS '自定义文本';
