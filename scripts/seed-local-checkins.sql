-- 本地测试：为用户创建签到记录

-- 1. 获取第一个活动的所有session
WITH event_sessions AS (
  SELECT s.session_id, s.event_id
  FROM session_flows s
  JOIN evt_events e ON s.event_id = e.event_id
  ORDER BY e.created_at DESC
  LIMIT 5
),
-- 2. 获取所有用户（前15个）
test_users AS (
  SELECT id as user_id, ROW_NUMBER() OVER (ORDER BY created_at) as user_num
  FROM auth.users
  WHERE email LIKE '%@flowmeet.com'
  LIMIT 15
)
-- 3. 为每个用户创建签到记录
INSERT INTO evt_assignments (session_id, user_id, checked_in)
SELECT
  es.session_id,
  tu.user_id,
  true
FROM test_users tu
CROSS JOIN (SELECT session_id FROM event_sessions LIMIT 1) es
ON CONFLICT (session_id, user_id) DO UPDATE
  SET checked_in = true;

-- 查看签到统计
SELECT
  COUNT(DISTINCT user_id) as 已签到用户数,
  COUNT(*) as 签到记录数
FROM evt_assignments
WHERE checked_in = true;
