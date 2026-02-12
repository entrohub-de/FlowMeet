-- 签到数据架构重构：将签到状态从 evt_assignments 迁移到 evt_signups
-- 目标：简化架构，提升性能，保留区域分配功能

-- Step 1: 为 evt_signups 添加签到相关字段
ALTER TABLE evt_signups
  ADD COLUMN IF NOT EXISTS checked_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Step 2: 数据迁移 - 从 evt_assignments 复制签到状态到 evt_signups
UPDATE evt_signups s
SET
  checked_in = COALESCE(a.checked_in, false),
  checked_in_at = CASE
    WHEN a.checked_in = true THEN a.assigned_at
    ELSE NULL
  END
FROM evt_assignments a
WHERE s.user_id = a.user_id
  AND s.event_id = a.session_id
  AND a.checked_in = true;

-- Step 3: 添加索引以优化签到查询
CREATE INDEX IF NOT EXISTS idx_evt_signups_checked_in
  ON evt_signups(event_id, checked_in);

CREATE INDEX IF NOT EXISTS idx_evt_signups_event_status_checkin
  ON evt_signups(event_id, status, checked_in);

-- Step 4: 移除 evt_assignments 的冗余字段
ALTER TABLE evt_assignments DROP COLUMN IF EXISTS checked_in;
ALTER TABLE evt_assignments DROP COLUMN IF EXISTS is_applied;

-- Step 5: 添加表注释说明新用途
COMMENT ON TABLE evt_assignments IS '用户区域分配表（签到状态已迁移至 evt_signups）';
COMMENT ON COLUMN evt_signups.checked_in IS '用户是否已签到';
COMMENT ON COLUMN evt_signups.checked_in_at IS '签到时间';
