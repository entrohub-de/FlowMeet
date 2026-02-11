-- 为 evt_signups 添加 status 字段
-- 用于标记报名状态，保留取消的报名记录

-- 1. 添加 status 列
ALTER TABLE "public"."evt_signups"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

-- 2. 添加 CHECK 约束，限制 status 的值
ALTER TABLE "public"."evt_signups"
  ADD CONSTRAINT "evt_signups_status_check"
  CHECK (status IN ('active', 'cancelled', 'pending'));

-- 3. 创建索引，方便查询特定状态的报名
CREATE INDEX IF NOT EXISTS "idx_evt_signups_status"
  ON "public"."evt_signups" ("status");

-- 4. 创建复合索引，方便查询特定活动的活跃报名
CREATE INDEX IF NOT EXISTS "idx_evt_signups_event_status"
  ON "public"."evt_signups" ("event_id", "status");

-- 5. 更新 RLS 策略
-- 删除原来的 delete 策略，改为 update 策略（将状态改为 cancelled）
DROP POLICY IF EXISTS "evt_signups_delete" ON "public"."evt_signups";

-- 用户可以更新自己的报名状态（比如取消报名）
CREATE POLICY "evt_signups_update"
  ON "public"."evt_signups"
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. 更新权限（添加 UPDATE 权限）
GRANT UPDATE ON TABLE "public"."evt_signups" TO authenticated;

-- 7. 添加注释
COMMENT ON COLUMN "public"."evt_signups"."status" IS '报名状态: active-活跃, cancelled-已取消, pending-待确认';

-- 8. 将现有数据的 status 设置为 'active'（如果有数据的话）
UPDATE "public"."evt_signups"
SET status = 'active'
WHERE status IS NULL;
