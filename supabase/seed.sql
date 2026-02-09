-- 种子数据：创建测试用户、活动和期待
-- 此脚本用于本地开发环境

-- 1. 创建20个测试用户
DO $$
DECLARE
  new_user_id UUID;
  i INTEGER;
  user_names TEXT[] := ARRAY[
    '张伟 (David)', 'Lisa Wang', '王芳 (Fiona)', 'Alex Liu', 'Emily Chen',
    'Kevin Yang', 'Sophia Zhao', '黄磊 (Leo)', 'Jason Zhou', 'Michelle Wu',
    '徐涛 (Tony)', 'Sarah Sun', 'Mary Ma', 'Frank Zhu', 'Helen Hu',
    'Ryan Lin', 'Grace He', 'Michael Guo', 'Lucy Luo', 'Daniel Liang'
  ];
  email_prefixes TEXT[] := ARRAY[
    'david.zhang', 'lisa.wang', 'fiona.wang', 'alex.liu', 'emily.chen',
    'kevin.yang', 'sophia.zhao', 'leo.huang', 'jason.zhou', 'michelle.wu',
    'tony.xu', 'sarah.sun', 'mary.ma', 'frank.zhu', 'helen.hu',
    'ryan.lin', 'grace.he', 'michael.guo', 'lucy.luo', 'daniel.liang'
  ];
  genders TEXT[] := ARRAY[
    'male', 'female', 'female', 'male', 'female',
    'male', 'female', 'male', 'male', 'female',
    'male', 'female', 'female', 'male', 'female',
    'male', 'female', 'male', 'female', 'male'
  ];
BEGIN
  FOR i IN 1..20 LOOP
    -- 生成用户ID
    new_user_id := gen_random_uuid();

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
      email_prefixes[i] || '@flowmeet.com',
      crypt('password123', gen_salt('bf')), -- 密码: password123
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', user_names[i]),
      FALSE,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      ''
    );

    -- 创建用户角色
    INSERT INTO public.evt_event_roles (user_id, role)
    VALUES (new_user_id, 'user')
    ON CONFLICT (user_id) DO NOTHING;

    -- 创建用户资料
    INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
    VALUES (
      new_user_id,
      user_names[i],
      genders[i],
      CASE (i % 4)
        WHEN 0 THEN '18-24'
        WHEN 1 THEN '25-34'
        WHEN 2 THEN '35-44'
        ELSE '45+'
      END
    );
  END LOOP;
END $$;

-- 2. 创建额外的活动（在现有4个活动基础上再加6个）
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

-- 3. 为每个用户创建期待（平均每人1-2个期待）
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

-- 4. 为所有活动生成签到码
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
