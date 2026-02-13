-- Rename evt_expectations → expctn_event
-- Expectation tables now use the expctn_ domain prefix

-- ============================================================================
-- 1) Rename table
-- ============================================================================
ALTER TABLE public.evt_expectations RENAME TO expctn_event;

-- ============================================================================
-- 2) Rename constraints
-- ============================================================================
ALTER TABLE public.expctn_event RENAME CONSTRAINT evt_expectations_pkey TO expctn_event_pkey;
ALTER TABLE public.expctn_event RENAME CONSTRAINT evt_expectations_event_id_fkey TO expctn_event_event_id_fkey;
ALTER TABLE public.expctn_event RENAME CONSTRAINT evt_expectations_user_id_fkey TO expctn_event_user_id_fkey;
ALTER TABLE public.expctn_event RENAME CONSTRAINT evt_expectations_event_user_key TO expctn_event_event_user_key;
ALTER TABLE public.expctn_event RENAME CONSTRAINT evt_expectations_status_check TO expctn_event_status_check;

-- ============================================================================
-- 3) Rename indexes
-- ============================================================================
ALTER INDEX idx_evt_expectations_event_id RENAME TO idx_expctn_event_event_id;
ALTER INDEX idx_evt_expectations_user_id RENAME TO idx_expctn_event_user_id;
ALTER INDEX idx_evt_expectations_event_user RENAME TO idx_expctn_event_event_user;
ALTER INDEX idx_evt_expectations_status RENAME TO idx_expctn_event_status;

-- ============================================================================
-- 4) Update table comment
-- ============================================================================
COMMENT ON TABLE public.expctn_event IS '用户对活动的期待（per-event expectations）';
