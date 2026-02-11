-- 为 evt_events 表添加 RLS 策略

-- 允许所有人查看活动（匿名用户和认证用户）
CREATE POLICY "evt_events_select_all"
  ON "public"."evt_events"
  FOR SELECT
  TO public
  USING (true);

-- 允许认证用户创建活动
CREATE POLICY "evt_events_insert_authenticated"
  ON "public"."evt_events"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允许认证用户更新活动
CREATE POLICY "evt_events_update_authenticated"
  ON "public"."evt_events"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 允许认证用户删除活动
CREATE POLICY "evt_events_delete_authenticated"
  ON "public"."evt_events"
  FOR DELETE
  TO authenticated
  USING (true);

-- 添加注释
COMMENT ON POLICY "evt_events_select_all" ON "public"."evt_events" IS '允许所有人查看活动';
COMMENT ON POLICY "evt_events_insert_authenticated" ON "public"."evt_events" IS '允许认证用户创建活动';
COMMENT ON POLICY "evt_events_update_authenticated" ON "public"."evt_events" IS '允许认证用户更新活动';
COMMENT ON POLICY "evt_events_delete_authenticated" ON "public"."evt_events" IS '允许认证用户删除活动';
