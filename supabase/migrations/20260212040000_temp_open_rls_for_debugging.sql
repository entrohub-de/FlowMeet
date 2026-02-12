-- 临时：完全开放 evt_signups 的 UPDATE 策略用于调试
-- 这将帮助我们确认问题是否在 RLS 策略中

-- 删除当前策略
DROP POLICY IF EXISTS "evt_signups_update" ON "public"."evt_signups";

-- 创建完全开放的策略（仅用于调试！）
CREATE POLICY "evt_signups_update_temp"
  ON "public"."evt_signups"
  FOR UPDATE
  TO authenticated
  USING (true)  -- 允许查看所有行
  WITH CHECK (true);  -- 允许所有更新

-- 添加注释
COMMENT ON POLICY "evt_signups_update_temp" ON "public"."evt_signups" IS
  '临时调试策略 - 完全开放，仅用于测试！';
