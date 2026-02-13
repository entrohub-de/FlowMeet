-- 简化版：创建测试小组数据
-- 在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 清空现有小组数据
DELETE FROM evt_groups;

-- 2. 创建4个小组 (使用第一个活动的 event_id)
INSERT INTO evt_groups (event_id, name, max_size)
SELECT
  event_id,
  '第 ' || num || ' 组' as name,
  6 as max_size
FROM
  (SELECT event_id FROM evt_events ORDER BY created_at DESC LIMIT 1) e,
  (SELECT generate_series(1, 4) as num) n;

-- 3. 将已签到的用户分配到小组中
WITH
  event_info AS (
    SELECT event_id FROM evt_events ORDER BY created_at DESC LIMIT 1
  ),
  groups_ordered AS (
    SELECT group_id, ROW_NUMBER() OVER (ORDER BY name) - 1 as group_num
    FROM evt_groups
    WHERE event_id = (SELECT event_id FROM event_info)
  ),
  users_checked_in AS (
    SELECT DISTINCT a.user_id, ROW_NUMBER() OVER (ORDER BY a.user_id) - 1 as user_num
    FROM evt_assignments a
    JOIN session_flows s ON a.session_id = s.session_id
    WHERE s.event_id = (SELECT event_id FROM event_info)
    AND a.checked_in = true
  )
INSERT INTO evt_group_members (group_id, user_id)
SELECT
  g.group_id,
  u.user_id
FROM users_checked_in u
JOIN groups_ordered g ON (u.user_num % 4) = g.group_num;

-- 4. 查看结果
SELECT
  g.name as 小组名称,
  COUNT(gm.user_id) as 成员数,
  STRING_AGG(p.nickname, ', ') as 成员列表
FROM evt_groups g
LEFT JOIN evt_group_members gm ON g.group_id = gm.group_id
LEFT JOIN usr_profiles p ON gm.user_id = p.user_id
GROUP BY g.group_id, g.name
ORDER BY g.name;
