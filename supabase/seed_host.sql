-- Host测试环境种子数据
-- 用于模拟主办方操作流程的测试数据

BEGIN;

-- 1. 创建Host测试账号
DO $$
DECLARE
  host_user_id UUID;
  host_email TEXT := 'host@flowmeet.test';
BEGIN
  -- 检查是否已存在
  SELECT id INTO host_user_id FROM auth.users WHERE email = host_email;

  IF host_user_id IS NULL THEN
    host_user_id := gen_random_uuid();

    -- 创建auth用户
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    ) VALUES (
      host_user_id,
      '00000000-0000-0000-0000-000000000000',
      host_email,
      crypt('host123', gen_salt('bf')), -- 密码: host123
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', '活动主办方'),
      FALSE,
      'authenticated',
      'authenticated'
    );

    RAISE NOTICE '✅ 创建Host账号：%', host_email;
  ELSE
    RAISE NOTICE 'ℹ️  Host账号已存在：%', host_email;
  END IF;

  -- 设置角色为host
  INSERT INTO public.usr_role (user_id, role)
  VALUES (host_user_id, 'host')
  ON CONFLICT (user_id) DO UPDATE SET role = 'host';

  -- 创建profile
  INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
  VALUES (host_user_id, '测试主办方', 'other', '25-34')
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = '测试主办方';

  RAISE NOTICE '👤 Host用户ID: %', host_user_id;
  RAISE NOTICE '';
END $$;

-- 2. 创建由Host管理的测试活动（展示不同阶段）
DO $$
DECLARE
  host_user_id UUID;
  event1_id UUID := gen_random_uuid();
  event2_id UUID := gen_random_uuid();
  event3_id UUID := gen_random_uuid();
  session1_id UUID := gen_random_uuid();
  session2_id UUID := gen_random_uuid();
  session3_id UUID := gen_random_uuid();
  participant_ids UUID[];
  i INTEGER;
BEGIN
  -- 获取host用户ID
  SELECT id INTO host_user_id FROM auth.users WHERE email = 'host@flowmeet.test';

  IF host_user_id IS NULL THEN
    RAISE EXCEPTION 'Host用户不存在，请先运行seed.sql创建基础数据';
  END IF;

  -- 活动1: 正在进行中的活动（最适合测试配对）
  INSERT INTO public.evt_events (
    event_id, name, description, start_time, end_time,
    checkin_qr_enabled, checkin_code, created_at
  ) VALUES (
    event1_id,
    '🎯 测试活动 - 配对进行中',
    '主办方创建的测试活动。当前正在进行，用于测试配对和位置功能。',
    NOW() - INTERVAL '30 minutes',
    NOW() + INTERVAL '1.5 hours',
    true,
    '123456',
    NOW() - INTERVAL '2 days'
  );

  INSERT INTO public.session_flows (session_id, event_id, name, start_time, end_time)
  VALUES (
    session1_id, event1_id, '第一场',
    NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '1.5 hours'
  );

  -- 活动2: 即将开始的活动（测试报名阶段）
  INSERT INTO public.evt_events (
    event_id, name, description, start_time, end_time,
    checkin_qr_enabled, checkin_code, created_at
  ) VALUES (
    event2_id,
    '📅 测试活动 - 即将开始',
    '明天开始的活动，用于测试报名流程。',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '1 day 2 hours',
    true,
    '654321',
    NOW() - INTERVAL '1 day'
  );

  INSERT INTO public.session_flows (session_id, event_id, name, start_time, end_time)
  VALUES (
    session2_id, event2_id, '第一场',
    NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 2 hours'
  );

  -- 活动3: 已结束的活动（测试历史数据）
  INSERT INTO public.evt_events (
    event_id, name, description, start_time, end_time,
    checkin_qr_enabled, checkin_code, created_at
  ) VALUES (
    event3_id,
    '✅ 测试活动 - 已结束',
    '昨天结束的活动，用于测试历史数据和报告。',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days' + INTERVAL '2 hours',
    true,
    '111111',
    NOW() - INTERVAL '3 days'
  );

  INSERT INTO public.session_flows (session_id, event_id, name, start_time, end_time)
  VALUES (
    session3_id, event3_id, '第一场',
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'
  );

  -- 获取前10个参与者用户ID
  SELECT ARRAY_AGG(id) INTO participant_ids
  FROM auth.users
  WHERE email LIKE '%@flowmeet.com'
  LIMIT 10;

  IF ARRAY_LENGTH(participant_ids, 1) < 5 THEN
    RAISE NOTICE '⚠️  参与者用户不足，请先运行seed.sql';
    RETURN;
  END IF;

  -- 为活动1（进行中）创建报名和签到数据
  FOR i IN 1..LEAST(8, ARRAY_LENGTH(participant_ids, 1)) LOOP
    INSERT INTO public.evt_assignments (session_id, user_id, checked_in)
    VALUES (session1_id, participant_ids[i], true)
    ON CONFLICT (session_id, user_id) DO UPDATE SET checked_in = true;
  END LOOP;

  -- 为活动2（即将开始）创建报名数据（未签到）
  FOR i IN 1..LEAST(6, ARRAY_LENGTH(participant_ids, 1)) LOOP
    INSERT INTO public.evt_assignments (session_id, user_id, checked_in)
    VALUES (session2_id, participant_ids[i], false)
    ON CONFLICT (session_id, user_id) DO NOTHING;
  END LOOP;

  -- 为活动3（已结束）创建完整数据（报名、签到、配对、评分）
  FOR i IN 1..LEAST(5, ARRAY_LENGTH(participant_ids, 1)) LOOP
    INSERT INTO public.evt_assignments (session_id, user_id, checked_in)
    VALUES (session3_id, participant_ids[i], true)
    ON CONFLICT (session_id, user_id) DO UPDATE SET checked_in = true;
  END LOOP;

  -- 创建活动1的配对数据（多种场景）
  IF ARRAY_LENGTH(participant_ids, 1) >= 6 THEN
    -- 场景1: 双方都有位置
    INSERT INTO public.evt_matches (
      event_id, user1_id, user2_id, status,
      user1_location, user2_location,
      location_updated_by_user1_at, location_updated_by_user2_at
    ) VALUES (
      event1_id, participant_ids[1], participant_ids[2], 'accepted',
      '咖啡区靠窗', '二楼休息区',
      NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '3 minutes'
    );

    -- 场景2: 只有一方位置
    INSERT INTO public.evt_matches (
      event_id, user1_id, user2_id, status,
      user1_location, user2_location,
      location_updated_by_user1_at, location_updated_by_user2_at
    ) VALUES (
      event1_id, participant_ids[3], participant_ids[4], 'accepted',
      NULL, '主会场入口',
      NULL, NOW() - INTERVAL '10 minutes'
    );

    -- 场景3: 待处理
    INSERT INTO public.evt_matches (
      event_id, user1_id, user2_id, status
    ) VALUES (
      event1_id, participant_ids[5], participant_ids[6], 'pending'
    );

    -- 场景4: 已完成
    INSERT INTO public.evt_matches (
      event_id, user1_id, user2_id, status,
      user1_location, user2_location,
      location_updated_by_user1_at, location_updated_by_user2_at
    ) VALUES (
      event1_id, participant_ids[1], participant_ids[3], 'completed',
      '前台', '咖啡区',
      NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '28 minutes'
    );
  END IF;

  -- 创建期待数据
  IF ARRAY_LENGTH(participant_ids, 1) >= 4 THEN
    INSERT INTO public.evt_expectations (event_id, user_id, content)
    VALUES
      (event1_id, participant_ids[1], '希望认识更多技术领域的朋友'),
      (event1_id, participant_ids[2], '期待了解最新的行业动态'),
      (event2_id, participant_ids[3], '想要寻找创业合作伙伴'),
      (event2_id, participant_ids[4], '希望学习新的技能')
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Host测试环境创建成功！';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 创建的活动：';
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣  活动1: 测试活动 - 配对进行中';
  RAISE NOTICE '   状态: 正在进行 ⏳';
  RAISE NOTICE '   签到码: 123456';
  RAISE NOTICE '   已签到: 8人';
  RAISE NOTICE '   配对: 4组（不同状态）';
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣  活动2: 测试活动 - 即将开始';
  RAISE NOTICE '   状态: 未开始 📅';
  RAISE NOTICE '   签到码: 654321';
  RAISE NOTICE '   已报名: 6人';
  RAISE NOTICE '   配对: 无';
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣  活动3: 测试活动 - 已结束';
  RAISE NOTICE '   状态: 已结束 ✅';
  RAISE NOTICE '   签到码: 111111';
  RAISE NOTICE '   已签到: 5人';
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 登录信息：';
  RAISE NOTICE '';
  RAISE NOTICE '👨‍💼 Host账号（主办方）:';
  RAISE NOTICE '   邮箱: host@flowmeet.test';
  RAISE NOTICE '   密码: host123';
  RAISE NOTICE '   访问: /host';
  RAISE NOTICE '';
  RAISE NOTICE '👥 参与者账号:';
  RAISE NOTICE '   邮箱: david.zhang@flowmeet.com';
  RAISE NOTICE '   密码: password123';
  RAISE NOTICE '   访问: /user/matching';
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 测试流程建议：';
  RAISE NOTICE '';
  RAISE NOTICE '作为Host:';
  RAISE NOTICE '1. 登录host账号';
  RAISE NOTICE '2. 查看活动管理页面';
  RAISE NOTICE '3. 查看报名和签到情况';
  RAISE NOTICE '4. 管理活动配对（如果有相关功能）';
  RAISE NOTICE '';
  RAISE NOTICE '作为参与者:';
  RAISE NOTICE '1. 登录参与者账号';
  RAISE NOTICE '2. 查看配对页面';
  RAISE NOTICE '3. 测试位置更新';
  RAISE NOTICE '4. 查看不同状态的配对';
  RAISE NOTICE '';
  RAISE NOTICE '================================';

END $$;

COMMIT;
