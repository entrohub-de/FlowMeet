-- 为 evt_events 添加 description 列
ALTER TABLE "public"."evt_events" ADD COLUMN IF NOT EXISTS "description" text;

-- 使 venue_id 可为空（允许活动没有关联场地）
ALTER TABLE "public"."evt_events" ALTER COLUMN "venue_id" DROP NOT NULL;

-- 插入示例场地
INSERT INTO "public"."evt_venues" (venue_id, name, capacity) VALUES
  ('a0000000-0000-0000-0000-000000000001', '上海市浦东新区张江高科技园区', 200),
  ('a0000000-0000-0000-0000-000000000002', '北京市朝阳区 WeWork 社区空间', 80),
  ('a0000000-0000-0000-0000-000000000003', '深圳市南山区科技园创新中心', 120)
ON CONFLICT (venue_id) DO NOTHING;

-- 插入示例活动
INSERT INTO "public"."evt_events" (event_id, venue_id, name, description, start_time, end_time) VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'FlowMeet 技术沙龙 · AI 与未来',
    '探讨人工智能在各行业的应用前景，邀请多位技术专家分享最新趋势与实践经验。适合对 AI 感兴趣的开发者、产品经理和创业者。',
    '2026-03-15T14:00:00+08:00',
    '2026-03-15T17:00:00+08:00'
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '创业者社交之夜',
    '一场轻松愉快的社交活动，连接不同背景的创业者，分享经验、寻找合作机会。提供茶歇和自由交流时间。',
    '2026-03-22T18:30:00+08:00',
    '2026-03-22T21:00:00+08:00'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'Design Thinking Workshop',
    'A hands-on workshop exploring design thinking methodologies. Learn how to apply creative problem-solving techniques to real-world challenges.',
    '2026-04-05T09:00:00+08:00',
    '2026-04-05T12:00:00+08:00'
  ),
  (
    'e0000000-0000-0000-0000-000000000004',
    NULL,
    '开源社区线下 Meetup',
    '聚集开源爱好者，分享开源项目经验，讨论社区建设与协作模式。欢迎带上你的项目来展示！',
    '2026-04-12T13:00:00+08:00',
    '2026-04-12T17:30:00+08:00'
  )
ON CONFLICT (event_id) DO NOTHING;

-- 添加 RLS 策略：允许所有用户读取活动和场地
CREATE POLICY "Allow public read events"
  ON "public"."evt_events"
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read venues"
  ON "public"."evt_venues"
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING (true);
