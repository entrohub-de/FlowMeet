-- 种子数据：创建测试用户、活动和期待
-- 此脚本用于本地开发环境

-- 1. 创建100个测试用户
DO $$
DECLARE
  new_user_id UUID;
  i INTEGER;
  user_name TEXT;
  email_prefix TEXT;
  gender TEXT;
  base_names TEXT[] := ARRAY[
    '张伟 (David)', 'Lisa Wang', '王芳 (Fiona)', 'Alex Liu', 'Emily Chen',
    'Kevin Yang', 'Sophia Zhao', '黄磊 (Leo)', 'Jason Zhou', 'Michelle Wu',
    '徐涛 (Tony)', 'Sarah Sun', 'Mary Ma', 'Frank Zhu', 'Helen Hu',
    'Ryan Lin', 'Grace He', 'Michael Guo', 'Lucy Luo', 'Daniel Liang'
  ];
  base_emails TEXT[] := ARRAY[
    'david.zhang', 'lisa.wang', 'fiona.wang', 'alex.liu', 'emily.chen',
    'kevin.yang', 'sophia.zhao', 'leo.huang', 'jason.zhou', 'michelle.wu',
    'tony.xu', 'sarah.sun', 'mary.ma', 'frank.zhu', 'helen.hu',
    'ryan.lin', 'grace.he', 'michael.guo', 'lucy.luo', 'daniel.liang'
  ];
BEGIN
  FOR i IN 1..100 LOOP
    -- 生成用户ID
    new_user_id := gen_random_uuid();

    -- 生成用户名和邮箱（前20个使用预定义名字，后80个使用生成的名字）
    IF i <= 20 THEN
      user_name := base_names[i];
      email_prefix := base_emails[i];
    ELSE
      user_name := 'User ' || i::TEXT;
      email_prefix := 'user' || i::TEXT;
    END IF;

    -- 性别交替分配
    IF i % 2 = 0 THEN
      gender := 'female';
    ELSE
      gender := 'male';
    END IF;

    -- 插入到 auth.users 表
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
      aud,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      email_prefix || '@flowmeet.com',
      crypt('password123', gen_salt('bf')), -- 密码: password123
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', user_name),
      FALSE,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );

    -- 创建用户角色
    INSERT INTO public.usr_role (user_id, role)
    VALUES (new_user_id, 'user')
    ON CONFLICT (user_id) DO NOTHING;

    -- 创建用户资料
    INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
    VALUES (
      new_user_id,
      user_name,
      gender,
      CASE (i % 4)
        WHEN 0 THEN '18-24'
        WHEN 1 THEN '25-34'
        WHEN 2 THEN '35-44'
        ELSE '45+'
      END
    );
  END LOOP;
END $$;

-- 2. 创建Host测试账号
DO $$
DECLARE
  host_user_id UUID;
BEGIN
  host_user_id := gen_random_uuid();

  -- 创建host账号
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
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    host_user_id,
    '00000000-0000-0000-0000-000000000000',
    'host@flowmeet.test',
    crypt('host123', gen_salt('bf')), -- 密码: host123
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', 'Host Admin'),
    FALSE,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  );

  -- 分配host角色
  INSERT INTO public.usr_role (user_id, role)
  VALUES (host_user_id, 'host')
  ON CONFLICT (user_id) DO UPDATE SET role = 'host';

  -- 创建host用户资料
  INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
  VALUES (
    host_user_id,
    'Host Admin',
    'male',
    '25-34'
  );

  RAISE NOTICE '✅ Host账号已创建: host@flowmeet.test / host123';
END $$;

-- 3. 创建额外的活动（在现有4个活动基础上再加6个）
INSERT INTO public.evt_events (event_id, venue_id, name, description, start_time, end_time, checkin_qr_enabled) VALUES
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000001',
    'Python 编程入门工作坊',
    '适合零基础学员的 Python 编程入门课程，通过实战项目快速上手编程。',
    '2026-04-18T14:00:00+08:00',
    '2026-04-18T17:00:00+08:00',
    true
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000002',
    '产品经理交流会',
    '资深产品经理分享产品设计心得，讨论用户体验优化方案。',
    '2026-04-25T18:30:00+08:00',
    '2026-04-25T21:00:00+08:00',
    true
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000003',
    '区块链技术分享',
    '深入探讨区块链技术原理与应用场景，了解 Web3 发展趋势。',
    '2026-05-02T09:00:00+08:00',
    '2026-05-02T12:00:00+08:00',
    true
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000001',
    '摄影爱好者聚会',
    '摄影爱好者的线下交流活动，分享拍摄技巧和后期处理经验。',
    '2026-05-09T13:00:00+08:00',
    '2026-05-09T17:30:00+08:00',
    true
  ),
  (
    gen_random_uuid(),
    'a0000000-0000-0000-0000-000000000002',
    'UI/UX 设计研讨会',
    '探讨最新的 UI/UX 设计趋势，分享优秀设计案例。',
    '2026-05-16T14:00:00+08:00',
    '2026-05-16T18:00:00+08:00',
    true
  ),
  (
    gen_random_uuid(),
    NULL,
    '读书会 · 认知觉醒',
    '共读《认知觉醒》，交流个人成长心得，建立深度思考习惯。',
    '2026-05-23T15:00:00+08:00',
    '2026-05-23T17:00:00+08:00',
    true
  );

-- 4. 为每个用户创建期待（平均每人1-2个期待）
DO $$
DECLARE
  user_record RECORD;
  event_record RECORD;
  event_ids UUID[];
  selected_event_id UUID;
  expectation_count INTEGER;
  j INTEGER;
  expectations TEXT[] := ARRAY[
    '希望能认识更多志同道合的朋友',
    '期待学习到新的技能和知识',
    '想要了解行业最新动态和趋势',
    '希望找到合作伙伴或投资机会',
    '期待获得职业发展的建议',
    '想要分享自己的经验和见解',
    '希望能建立长期的人脉关系',
    '期待参与有趣的讨论和头脑风暴',
    '想要放松心情，享受社交时光',
    '希望能找到解决问题的新思路',
    '期待了解不同背景人的想法',
    '想要提升沟通和表达能力',
    '希望能获得实用的工具和资源',
    '期待感受社区的活力和氛围',
    '想要探索新的兴趣方向',
    '希望能得到导师的指导',
    '期待结识行业大咖',
    '想要了解成功案例和经验',
    '希望能找到学习伙伴',
    '期待度过充实的周末时光'
  ];
BEGIN
  -- 获取所有活动ID
  SELECT ARRAY_AGG(event_id) INTO event_ids FROM public.evt_events;

  -- 为每个用户创建期待
  FOR user_record IN
    SELECT id FROM auth.users WHERE email LIKE '%@flowmeet.com'
  LOOP
    -- 随机决定这个用户创建几个期待（0-2个）
    expectation_count := FLOOR(RANDOM() * 3);

    FOR j IN 1..expectation_count LOOP
      -- 随机选择一个活动
      selected_event_id := event_ids[1 + FLOOR(RANDOM() * ARRAY_LENGTH(event_ids, 1))];

      -- 创建期待（使用 ON CONFLICT 避免重复）
      INSERT INTO public.evt_expectations (event_id, user_id, content)
      VALUES (
        selected_event_id,
        user_record.id,
        expectations[1 + FLOOR(RANDOM() * ARRAY_LENGTH(expectations, 1))]
      )
      ON CONFLICT (event_id, user_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5. 为所有活动生成签到码
UPDATE public.evt_events
SET checkin_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0')
WHERE checkin_code IS NULL;

-- 输出统计信息
DO $$
DECLARE
  user_count INTEGER;
  event_count INTEGER;
  expectation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE email LIKE '%@flowmeet.com';
  SELECT COUNT(*) INTO event_count FROM public.evt_events;
  SELECT COUNT(*) INTO expectation_count FROM public.evt_expectations;

  RAISE NOTICE '✅ 种子数据创建完成！';
  RAISE NOTICE '📊 统计信息：';
  RAISE NOTICE '   - 测试用户数：%', user_count;
  RAISE NOTICE '   - 活动总数：%', event_count;
  RAISE NOTICE '   - 期待总数：%', expectation_count;
END $$;

-- 6. 创建配对测试数据（展示不同的配对状态和位置场景）
DO $$
DECLARE
  test_event_id UUID;
  test_session_id UUID;
  user_ids UUID[];
  user1_id UUID;
  user2_id UUID;
  user3_id UUID;
  user4_id UUID;
  user5_id UUID;
  user6_id UUID;
BEGIN
  -- 创建一个专门用于测试配对的活动
  test_event_id := gen_random_uuid();
  test_session_id := gen_random_uuid();

  INSERT INTO public.evt_events (event_id, name, description, start_time, end_time, checkin_qr_enabled, checkin_code)
  VALUES (
    test_event_id,
    '配对测试活动 - 正在进行',
    '专门用于测试配对和位置功能的活动。包含多种配对状态场景。',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours',
    true,
    '888888'
  );

  -- 创建场次
  INSERT INTO public.session_flows (session_id, event_id, name, start_time, end_time)
  VALUES (
    test_session_id,
    test_event_id,
    '测试场次',
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '2 hours'
  );

  -- 获取前6个测试用户
  SELECT ARRAY_AGG(id) INTO user_ids
  FROM auth.users
  WHERE email LIKE '%@flowmeet.com'
  LIMIT 6;

  IF ARRAY_LENGTH(user_ids, 1) < 6 THEN
    RAISE NOTICE '⚠️  需要至少6个测试用户才能创建完整的配对场景';
    RETURN;
  END IF;

  user1_id := user_ids[1];
  user2_id := user_ids[2];
  user3_id := user_ids[3];
  user4_id := user_ids[4];
  user5_id := user_ids[5];
  user6_id := user_ids[6];

  -- 为这些用户创建详细的偏好信息（用于匹配推荐）
  INSERT INTO public.usr_preferences (user_id, languages, interests, purpose, industry_background)
  VALUES
    (user1_id, '中文,英文', '技术,创业,AI', '社交,学习,寻找合作', '互联网,软件开发'),
    (user2_id, '中文,英文', '设计,创业,产品', '社交,寻找合作', '互联网,设计'),
    (user3_id, 'English,Chinese', 'Technology,Investment', 'Networking,Learning', 'Finance,VC'),
    (user4_id, 'English', 'Marketing,Content', 'Networking', 'Media,Marketing'),
    (user5_id, '中文', '摄影,艺术,旅行', '社交,灵感', '创意产业'),
    (user6_id, '中文,英文', '健康,运动,创业', '社交,学习', '健康产业')
  ON CONFLICT (user_id) DO UPDATE SET
    languages = EXCLUDED.languages,
    interests = EXCLUDED.interests,
    purpose = EXCLUDED.purpose,
    industry_background = EXCLUDED.industry_background;

  -- 让所有用户签到 - 更新 evt_signups 表
  UPDATE public.evt_signups
  SET checked_in = true, checked_in_at = NOW()
  WHERE event_id = test_event_id
    AND user_id = ANY(user_ids)
    AND status = 'active';

  -- 场景1: 完美场景 - 双方都设置了位置（刚刚更新）
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user1_id, user2_id, 'accepted',
    '咖啡区靠窗，穿蓝色T恤，戴黑框眼镜', '二楼休息区沙发，穿红色连衣裙',
    NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '1 minute'
  );

  -- 场景2: 只有对方位置 - 对方已设置位置，我还没设置
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user1_id, user3_id, 'accepted',
    NULL, '主会场入口，靠近签到台，穿黑色西装',
    NULL, NOW() - INTERVAL '5 minutes'
  );

  -- 场景3: 空位置 - 双方都还没设置位置
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user1_id, user4_id, 'accepted',
    NULL, NULL,
    NULL, NULL
  );

  -- 场景4: 待处理状态 - 不应该显示位置功能
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status
  ) VALUES (
    test_event_id, user1_id, user5_id, 'pending'
  );

  -- 场景5: 已完成状态 - 显示历史位置（只读）
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user2_id, user3_id, 'completed',
    '咖啡区', '前台',
    NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '28 minutes'
  );

  -- 场景6: 旧位置 - 测试时间显示（几小时前）
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user1_id, user6_id, 'accepted',
    '三楼会议室B门口', NULL,
    NOW() - INTERVAL '2 hours 15 minutes', NULL
  );

  -- 场景7: 中等时间 - 测试分钟显示（30分钟前）
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status,
    user1_location, user2_location,
    location_updated_by_user1_at, location_updated_by_user2_at
  ) VALUES (
    test_event_id, user3_id, user4_id, 'accepted',
    NULL, '一楼大厅中央',
    NULL, NOW() - INTERVAL '30 minutes'
  );

  -- 场景8: 已拒绝状态 - 不应该显示
  INSERT INTO public.evt_matches (
    event_id, user1_id, user2_id, status
  ) VALUES (
    test_event_id, user5_id, user6_id, 'declined'
  );

  RAISE NOTICE '';
  RAISE NOTICE '🎯 配对测试场景已创建！';
  RAISE NOTICE '=================================';
  RAISE NOTICE '活动：配对测试活动 - 正在进行';
  RAISE NOTICE '签到码：888888';
  RAISE NOTICE '';
  RAISE NOTICE '测试场景：';
  RAISE NOTICE '1️⃣  双方都有位置（刚刚更新）';
  RAISE NOTICE '2️⃣  只有对方位置（5分钟前）';
  RAISE NOTICE '3️⃣  双方都没位置';
  RAISE NOTICE '4️⃣  待处理状态（不显示位置）';
  RAISE NOTICE '5️⃣  已完成状态（只读显示）';
  RAISE NOTICE '6️⃣  旧位置（2小时前）';
  RAISE NOTICE '7️⃣  中等时间（30分钟前）';
  RAISE NOTICE '8️⃣  已拒绝（不显示）';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 如何测试：';
  RAISE NOTICE '1. 登录: david.zhang@flowmeet.com / password123';
  RAISE NOTICE '2. 访问: /user/matching';
  RAISE NOTICE '3. 选择: 配对测试活动 - 正在进行';
  RAISE NOTICE '4. 查看: 不同状态的配对卡片';
  RAISE NOTICE '';
  RAISE NOTICE '💡 提示：';
  RAISE NOTICE '- 尝试更新你的位置';
  RAISE NOTICE '- 刷新页面查看对方位置';
  RAISE NOTICE '- 观察不同时间的显示格式';
  RAISE NOTICE '=================================';

END $$;
