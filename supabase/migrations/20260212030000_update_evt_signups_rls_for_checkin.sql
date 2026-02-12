-- 更新 evt_signups 的 RLS 策略，允许 Host 更新签到状态

-- 删除旧的 UPDATE 策略
DROP POLICY IF EXISTS "evt_signups_update" ON "public"."evt_signups";

-- 创建新的 UPDATE 策略：
-- 1. 用户可以更新自己的报名状态（取消报名等）
-- 2. Host 角色可以更新任何人的签到状态
CREATE POLICY "evt_signups_update"
  ON "public"."evt_signups"
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR  -- 用户更新自己的记录
    EXISTS (                  -- 或者是 host 角色
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role = 'host'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR  -- 用户更新自己的记录
    EXISTS (                  -- 或者是 host 角色
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role = 'host'
    )
  );

-- 添加注释
COMMENT ON POLICY "evt_signups_update" ON "public"."evt_signups" IS
  '允许用户更新自己的报名状态，或者 Host 角色更新任何人的签到状态';
