-- 创建测试小组数据
-- 假设使用第一个活动

DO $$
DECLARE
  v_event_id UUID;
  v_group1_id UUID;
  v_group2_id UUID;
  v_group3_id UUID;
  v_group4_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
  v_counter INT := 0;
BEGIN
  -- 获取第一个活动的ID
  SELECT event_id INTO v_event_id
  FROM evt_events
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE NOTICE 'No events found';
    RETURN;
  END IF;

  RAISE NOTICE 'Using event_id: %', v_event_id;

  -- 删除该活动已有的小组（如果有）
  DELETE FROM evt_groups WHERE event_id = v_event_id;

  -- 创建4个小组
  INSERT INTO evt_groups (event_id, name, max_size)
  VALUES
    (v_event_id, '第 1 组', 6),
    (v_event_id, '第 2 组', 6),
    (v_event_id, '第 3 组', 6),
    (v_event_id, '第 4 组', 6)
  RETURNING group_id INTO v_group1_id;

  -- 获取所有小组ID
  SELECT array_agg(group_id) INTO STRICT v_user_ids
  FROM (
    SELECT group_id FROM evt_groups WHERE event_id = v_event_id ORDER BY name
  ) AS groups;

  v_group1_id := v_user_ids[1];
  v_group2_id := v_user_ids[2];
  v_group3_id := v_user_ids[3];
  v_group4_id := v_user_ids[4];

  -- 获取所有已签到的用户
  SELECT array_agg(DISTINCT user_id) INTO v_user_ids
  FROM evt_assignments
  WHERE session_id IN (
    SELECT session_id FROM evt_sessions WHERE event_id = v_event_id
  )
  AND checked_in = true;

  IF array_length(v_user_ids, 1) IS NULL THEN
    RAISE NOTICE 'No checked-in users found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % checked-in users', array_length(v_user_ids, 1);

  -- 将用户分配到4个小组中
  FOREACH v_user_id IN ARRAY v_user_ids
  LOOP
    IF v_counter % 4 = 0 THEN
      INSERT INTO evt_group_members (group_id, user_id)
      VALUES (v_group1_id, v_user_id);
    ELSIF v_counter % 4 = 1 THEN
      INSERT INTO evt_group_members (group_id, user_id)
      VALUES (v_group2_id, v_user_id);
    ELSIF v_counter % 4 = 2 THEN
      INSERT INTO evt_group_members (group_id, user_id)
      VALUES (v_group3_id, v_user_id);
    ELSE
      INSERT INTO evt_group_members (group_id, user_id)
      VALUES (v_group4_id, v_user_id);
    END IF;

    v_counter := v_counter + 1;
  END LOOP;

  RAISE NOTICE 'Successfully created 4 groups and assigned % users', v_counter;

  -- 显示每个小组的成员数
  RAISE NOTICE 'Group 1 members: %', (SELECT COUNT(*) FROM evt_group_members WHERE group_id = v_group1_id);
  RAISE NOTICE 'Group 2 members: %', (SELECT COUNT(*) FROM evt_group_members WHERE group_id = v_group2_id);
  RAISE NOTICE 'Group 3 members: %', (SELECT COUNT(*) FROM evt_group_members WHERE group_id = v_group3_id);
  RAISE NOTICE 'Group 4 members: %', (SELECT COUNT(*) FROM evt_group_members WHERE group_id = v_group4_id);
END $$;
