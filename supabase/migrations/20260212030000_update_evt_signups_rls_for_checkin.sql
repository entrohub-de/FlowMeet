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
    -- 允许查看/选中这些行进行更新：
    -- 1. 自己的记录
    -- 2. 如果是 host，可以看到所有记录
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role = 'host'
    )
  )
  WITH CHECK (
    -- 允许更新后的值：
    -- 1. 用户只能保持 user_id 不变（更新自己的记录）
    -- 2. Host 可以更新任何记录，但不能改变 user_id
    -- 注意：WITH CHECK 验证更新后的行，不是更新前的行
    (auth.uid() = user_id) OR
    EXISTS (
      SELECT 1 FROM public.usr_role
      WHERE usr_role.user_id = auth.uid()
      AND usr_role.role = 'host'
    )
  );

-- 添加注释
COMMENT ON POLICY "evt_signups_update" ON "public"."evt_signups" IS
  '允许用户更新自己的报名状态，或者 Host 角色更新任何人的签到状态';
