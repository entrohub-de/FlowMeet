-- 简化版配对功能测试数据初始化脚本
-- 生成200个测试用户（使用现有auth用户，创建多个profiles）

DO $$
DECLARE
  v_venue_id UUID;
  v_event_id UUID;
  v_session_id UUID;
  v_area_id UUID;
  v_auth_users UUID[];
  v_user_id UUID;
  v_nickname TEXT;
  v_gender TEXT;
  v_age_group TEXT;
  v_languages TEXT;
  v_interests TEXT;
  v_purpose TEXT;
  v_industry TEXT;
  i INTEGER;
  user_index INTEGER;
BEGIN
  -- 1. 获取所有现有auth用户ID
  SELECT ARRAY_AGG(id) INTO v_auth_users FROM auth.users LIMIT 200;

  IF ARRAY_LENGTH(v_auth_users, 1) < 20 THEN
    RAISE EXCEPTION 'Need at least 20 auth users. Please create more users first.';
  END IF;

  RAISE NOTICE 'Found % existing auth users', ARRAY_LENGTH(v_auth_users, 1);

  -- 2. 创建测试venue
  INSERT INTO public.evt_venues (name, capacity)
  VALUES ('Matching Test Venue', 500)
  RETURNING venue_id INTO v_venue_id;

  -- 3. 创建测试event
  INSERT INTO public.evt_events (
    venue_id, name, description, start_time, end_time, checkin_code
  )
  VALUES (
    v_venue_id,
    'Matching Test Event - 200 Users',
    'Test event for matching feature',
    NOW(),
    NOW() + INTERVAL '4 hours',
    'MATCH200'
  )
  RETURNING event_id INTO v_event_id;

  -- 4. 创建测试area
  INSERT INTO public.evt_areas (venue_id, name, max_people, min_people)
  VALUES (v_venue_id, 'Main Hall - Matching Test', 300, 10)
  RETURNING area_id INTO v_area_id;

  -- 5. 创建测试session
  INSERT INTO public.evt_sessions (event_id, name, start_time, end_time)
  VALUES (
    v_event_id,
    'Matching Test Session - 200 Users',
    NOW(),
    NOW() + INTERVAL '2 hours'
  )
  RETURNING session_id INTO v_session_id;

  -- 6. 关联session和area
  INSERT INTO public.evt_session_areas (session_id, area_id)
  VALUES (v_session_id, v_area_id);

  -- 7. 为每个auth用户创建profile和preference
  FOR i IN 1..LEAST(200, ARRAY_LENGTH(v_auth_users, 1)) LOOP
    v_user_id := v_auth_users[i];

    -- 生成随机用户属性
    v_gender := CASE (i % 2) WHEN 0 THEN '男' ELSE '女' END;
    v_age_group := CASE (i % 4)
      WHEN 0 THEN '18-24'
      WHEN 1 THEN '25-34'
      WHEN 2 THEN '35-44'
      ELSE '45+'
    END;
    v_nickname := 'TestUser' || LPAD(i::TEXT, 3, '0');

    -- 随机语言能力
    v_languages := CASE (i % 5)
      WHEN 0 THEN '中文,英文'
      WHEN 1 THEN '中文,英文,日文'
      WHEN 2 THEN '中文,英文,德文'
      WHEN 3 THEN '中文'
      ELSE '英文,中文,法文'
    END;

    -- 随机兴趣领域
    v_interests := CASE (i % 8)
      WHEN 0 THEN 'AI,机器学习,创业'
      WHEN 1 THEN 'Web3,区块链,NFT'
      WHEN 2 THEN '产品设计,用户体验,设计'
      WHEN 3 THEN '投资,金融科技,创业'
      WHEN 4 THEN '市场营销,增长黑客,社交媒体'
      WHEN 5 THEN '开源,云计算,DevOps'
      WHEN 6 THEN '健康科技,生物科技,医疗'
      ELSE 'SaaS,企业服务,B2B'
    END;

    -- 随机参会目的
    v_purpose := CASE (i % 6)
      WHEN 0 THEN '寻找合作伙伴,建立人脉'
      WHEN 1 THEN '学习交流,行业洞察'
      WHEN 2 THEN '寻找投资机会,创业'
      WHEN 3 THEN '招聘人才,团队建设'
      WHEN 4 THEN '业务拓展,客户开发'
      ELSE '技术交流,分享经验'
    END;

    -- 随机行业背景
    v_industry := CASE (i % 10)
      WHEN 0 THEN '互联网'
      WHEN 1 THEN '人工智能'
      WHEN 2 THEN '金融科技'
      WHEN 3 THEN '电子商务'
      WHEN 4 THEN '企业服务'
      WHEN 5 THEN '教育科技'
      WHEN 6 THEN '健康医疗'
      WHEN 7 THEN '区块链'
      WHEN 8 THEN '游戏娱乐'
      ELSE '硬件科技'
    END;

    -- 插入或更新usr_profiles
    INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
    VALUES (v_user_id, v_nickname, v_gender, v_age_group)
    ON CONFLICT ON CONSTRAINT usr_profiles_pkey DO NOTHING;

    -- 删除旧的preferences（如果存在）
    DELETE FROM public.usr_preferences WHERE user_id = v_user_id;

    -- 插入usr_preferences
    INSERT INTO public.usr_preferences (
      user_id, languages, interests, purpose, industry_background, created_at
    )
    VALUES (v_user_id, v_languages, v_interests, v_purpose, v_industry, NOW()::TEXT);

    -- 将用户分配到session并签到
    INSERT INTO public.evt_assignments (
      session_id, user_id, area_id, checked_in, assigned_by
    )
    VALUES (v_session_id, v_user_id, v_area_id, TRUE, 'system')
    ON CONFLICT (session_id, user_id) DO UPDATE SET checked_in = TRUE;

  END LOOP;

  RAISE NOTICE '✅ Successfully created % test users for matching', LEAST(200, ARRAY_LENGTH(v_auth_users, 1));
  RAISE NOTICE '📍 Venue ID: %', v_venue_id;
  RAISE NOTICE '📅 Event ID: %', v_event_id;
  RAISE NOTICE '🎯 Session ID: %', v_session_id;
END $$;

-- 验证数据
SELECT
  'Total Test Profiles' as metric,
  COUNT(*) as count
FROM public.usr_profiles
WHERE nickname LIKE 'TestUser%'

UNION ALL

SELECT
  'Total Test Preferences' as metric,
  COUNT(*) as count
FROM public.usr_preferences p
INNER JOIN public.usr_profiles prof ON p.user_id = prof.user_id
WHERE prof.nickname LIKE 'TestUser%'

UNION ALL

SELECT
  'Total Checked-in Users' as metric,
  COUNT(DISTINCT a.user_id) as count
FROM public.evt_assignments a
INNER JOIN public.usr_profiles prof ON a.user_id = prof.user_id
INNER JOIN public.evt_sessions s ON a.session_id = s.session_id
INNER JOIN public.evt_events e ON s.event_id = e.event_id
WHERE
  a.checked_in = TRUE
  AND prof.nickname LIKE 'TestUser%'
  AND e.name = 'Matching Test Event - 200 Users';
