-- 为 evt_assignments 表添加 RLS 策略

-- 允许所有认证用户查看签到记录
CREATE POLICY "evt_assignments_select_authenticated"
  ON "public"."evt_assignments"
  FOR SELECT
  TO authenticated
  USING (true);

-- 允许所有认证用户插入签到记录（用于签到功能）
CREATE POLICY "evt_assignments_insert_authenticated"
  ON "public"."evt_assignments"
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允许所有认证用户更新签到记录（用于签到功能）
CREATE POLICY "evt_assignments_update_authenticated"
  ON "public"."evt_assignments"
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 允许所有认证用户删除签到记录
CREATE POLICY "evt_assignments_delete_authenticated"
  ON "public"."evt_assignments"
  FOR DELETE
  TO authenticated
  USING (true);

-- 添加注释
COMMENT ON POLICY "evt_assignments_select_authenticated" ON "public"."evt_assignments" IS '允许认证用户查看签到记录';
COMMENT ON POLICY "evt_assignments_insert_authenticated" ON "public"."evt_assignments" IS '允许认证用户插入签到记录';
COMMENT ON POLICY "evt_assignments_update_authenticated" ON "public"."evt_assignments" IS '允许认证用户更新签到记录';
COMMENT ON POLICY "evt_assignments_delete_authenticated" ON "public"."evt_assignments" IS '允许认证用户删除签到记录';
