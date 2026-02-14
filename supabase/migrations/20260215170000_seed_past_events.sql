-- 插入过去的 dummy 活动，用于测试"过去参加的活动"功能

-- 过去的活动（end_time 已过）
INSERT INTO public.evt_events (event_id, venue_id, name, description, start_time, end_time, checkin_qr_enabled, checkin_code) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    '新年创业者聚会 2026',
    '新年第一场创业者社交活动，回顾 2025 年经验教训，展望 2026 年新机遇。现场 50+ 位创业者参与。',
    '2026-01-11T14:00:00+08:00',
    '2026-01-11T17:00:00+08:00',
    true,
    '110126'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'AI 产品经理闭门分享会',
    '邀请 5 位 AI 领域资深产品经理，围绕大模型应用落地、用户体验设计进行深度分享。',
    '2026-01-18T18:30:00+08:00',
    '2026-01-18T21:00:00+08:00',
    true,
    '180126'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'Cross-Cultural Networking Night',
    'An evening of cross-cultural exchange bringing together professionals from diverse backgrounds. Activities include speed networking, cultural sharing, and collaborative games.',
    '2026-01-25T19:00:00+08:00',
    '2026-01-25T22:00:00+08:00',
    true,
    '250126'
  ),
  (
    'e1000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    '独立开发者 Demo Day',
    '10 位独立开发者现场展示自己的产品，互相点评、交流技术栈和商业化思路。',
    '2026-02-01T13:00:00+08:00',
    '2026-02-01T17:00:00+08:00',
    true,
    '010226'
  ),
  (
    'e1000000-0000-0000-0000-000000000005',
    NULL,
    '读书会 · 思考快与慢',
    '共读丹尼尔·卡尼曼经典著作《思考，快与慢》，讨论认知偏差在日常决策中的影响。',
    '2026-02-08T15:00:00+08:00',
    '2026-02-08T17:30:00+08:00',
    true,
    '080226'
  )
ON CONFLICT (event_id) DO NOTHING;

-- 为所有测试用户（@flowmeet.com）创建过去活动的报名记录（已签到）
DO $$
DECLARE
  user_record RECORD;
  past_event_ids UUID[] := ARRAY[
    'e1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0000-000000000005'
  ];
  ev_id UUID;
  signup_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT id FROM auth.users
    WHERE email LIKE '%@flowmeet.com'
       OR email LIKE '%@flowmeet.test'
  LOOP
    -- 每个用户随机参加 2-4 个过去的活动
    FOREACH ev_id IN ARRAY past_event_ids LOOP
      IF RANDOM() < 0.6 THEN
        INSERT INTO public.evt_signups (event_id, user_id, status, checked_in, checked_in_at)
        VALUES (ev_id, user_record.id, 'active', true, (
          SELECT end_time - INTERVAL '1 hour' FROM public.evt_events WHERE event_id = ev_id
        ))
        ON CONFLICT DO NOTHING;
        signup_count := signup_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '✅ 已创建 5 个过去的活动和 % 条报名记录', signup_count;
END $$;
