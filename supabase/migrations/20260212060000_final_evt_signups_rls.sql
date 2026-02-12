-- 最终的 evt_signups RLS 策略
-- 删除所有之前的策略，确保只有一个正确的策略

-- 1. 删除所有旧策略
DROP POLICY IF EXISTS "evt_signups_update" ON "public"."evt_signups";
DROP POLICY IF EXISTS "evt_signups_update_temp" ON "public"."evt_signups";

-- 2. 确保 is_user_host 函数存在
CREATE OR REPLACE FUNCTION public.is_user_host(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.usr_role
    WHERE user_id = check_user_id
    AND role = 'host'
  );
END;
$$;

-- 3. 创建最终的 UPDATE 策略
CREATE POLICY "evt_signups_update_final"
  ON "public"."evt_signups"
  FOR UPDATE
  TO authenticated
  USING (
    -- 允许查看/选中这些行进行更新：
    -- 1. 自己的记录
    -- 2. 如果是 host，可以看到所有记录
    (auth.uid() = user_id) OR
    public.is_user_host(auth.uid())
  )
  WITH CHECK (
    -- 允许更新后的值：
    -- 1. 用户只能更新自己的记录
    -- 2. Host 可以更新任何记录
    (auth.uid() = user_id) OR
    public.is_user_host(auth.uid())
  );

-- 4. 添加注释
COMMENT ON FUNCTION public.is_user_host IS '检查用户是否为 host 角色 (SECURITY DEFINER)';
COMMENT ON POLICY "evt_signups_update_final" ON "public"."evt_signups" IS
  '最终策略：允许用户更新自己的报名状态，或者 Host 角色更新任何人的签到状态';

-- 5. 启用表的 Realtime 功能
ALTER PUBLICATION supabase_realtime ADD TABLE evt_signups;
