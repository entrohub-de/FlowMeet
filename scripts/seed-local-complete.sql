-- 完整的本地测试数据：活动、sessions、签到、小组

-- 1. 创建一个测试venue（如果不存在）
INSERT INTO evt_venues (venue_id, name, capacity)
VALUES (gen_random_uuid(), '测试会场', 100)
ON CONFLICT DO NOTHING
RETURNING venue_id;

-- 2. 创建测试活动
DO $$
DECLARE
  v_venue_id UUID;
  v_event_id UUID;
  v_session_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
  v_counter INT := 0;
BEGIN
  -- 获取一个venue
  SELECT venue_id INTO v_venue_id FROM evt_venues LIMIT 1;

  -- 创建活动
  INSERT INTO evt_events (name, description, start_time, end_time, venue_id, checkin_code)
  VALUES (
    '本地测试活动',
    '用于测试小组功能的活动',
    NOW(),
    NOW() + INTERVAL '3 hours',
    v_venue_id,
    'TEST01'
  )
  RETURNING event_id INTO v_event_id;

  RAISE NOTICE '✅ 创建活动: %', v_event_id;

  -- 创建session
  INSERT INTO evt_sessions (event_id, name, start_time, end_time)
  VALUES (
    v_event_id,
    '主会场',
    NOW(),
    NOW() + INTERVAL '3 hours'
  )
  RETURNING session_id INTO v_session_id;

  RAISE NOTICE '✅ 创建session: %', v_session_id;

  -- 创建area
  DECLARE
    v_area_id UUID;
  BEGIN
    INSERT INTO evt_areas (venue_id, name, max_people, min_people)
    VALUES (v_venue_id, 'A区', 50, 10)
    RETURNING area_id INTO v_area_id;

    RAISE NOTICE '✅ 创建area: %', v_area_id;

    -- 关联session和area
    INSERT INTO evt_session_areas (session_id, area_id)
    VALUES (v_session_id, v_area_id);

  -- 获取所有用户ID
  SELECT array_agg(id) INTO v_user_ids
  FROM (SELECT id FROM auth.users LIMIT 15) u;

    -- 为用户创建签到记录
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      INSERT INTO evt_assignments (session_id, user_id, area_id, checked_in, assigned_by)
      VALUES (v_session_id, v_user_id, v_area_id, true, 'system');
      v_counter := v_counter + 1;
    END LOOP;
  END;

  RAISE NOTICE '✅ 创建了 % 个签到记录', v_counter;

  -- 创建4个小组
  DELETE FROM evt_groups WHERE event_id = v_event_id;

  INSERT INTO evt_groups (event_id, name, max_size)
  SELECT
    v_event_id,
    '第 ' || num || ' 组' as name,
    6 as max_size
  FROM generate_series(1, 4) as num;

  RAISE NOTICE '✅ 创建了4个小组';

  -- 将用户分配到小组
  WITH
    groups_ordered AS (
      SELECT group_id, ROW_NUMBER() OVER (ORDER BY name) - 1 as group_num
      FROM evt_groups
      WHERE event_id = v_event_id
    ),
    users_checked_in AS (
      SELECT user_id, ROW_NUMBER() OVER (ORDER BY user_id) - 1 as user_num
      FROM evt_assignments
      WHERE session_id = v_session_id AND checked_in = true
    )
  INSERT INTO evt_group_members (group_id, user_id)
  SELECT g.group_id, u.user_id
  FROM users_checked_in u
  JOIN groups_ordered g ON (u.user_num % 4) = g.group_num;

  RAISE NOTICE '✅ 完成用户分组';
END $$;

-- 查看结果
SELECT
  g.name as 小组,
  COUNT(gm.user_id) as 成员数,
  STRING_AGG(COALESCE(p.nickname, SUBSTRING(u.email FROM 1 FOR 10)), ', ') as 成员
FROM evt_groups g
LEFT JOIN evt_group_members gm ON g.group_id = gm.group_id
LEFT JOIN usr_profiles p ON gm.user_id = p.user_id
LEFT JOIN auth.users u ON gm.user_id = u.id
GROUP BY g.group_id, g.name
ORDER BY g.name;
