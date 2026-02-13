-- match_records: 每轮匹配独立记录
-- 将唯一约束从 (event_id, user1_id, user2_id) 改为 (event_id, user1_id, user2_id, active_module_id)
-- 这样同一对用户在不同轮次可以有不同的 match 记录

-- ============================================================================
-- 1) 替换唯一约束
-- ============================================================================
ALTER TABLE public.match_records DROP CONSTRAINT IF EXISTS unique_match;

-- NULLS NOT DISTINCT: 防止 active_module_id 为 NULL 时绕过唯一约束
ALTER TABLE public.match_records
  ADD CONSTRAINT unique_match_per_round
  UNIQUE NULLS NOT DISTINCT (event_id, user1_id, user2_id, active_module_id);

-- ============================================================================
-- 2) 更新 host_upsert_match 函数，增加 p_active_module_id 参数
-- ============================================================================
CREATE OR REPLACE FUNCTION public.host_upsert_match(
  p_event_id uuid,
  p_user1_id uuid,
  p_user2_id uuid,
  p_status varchar DEFAULT 'accepted',
  p_active_module_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_match_id uuid;
BEGIN
  SELECT role INTO v_role
    FROM public.usr_role
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF COALESCE(v_role, 'user') NOT IN ('host', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: only hosts can create matches';
  END IF;

  INSERT INTO public.match_records (event_id, user1_id, user2_id, status, active_module_id)
  VALUES (p_event_id, p_user1_id, p_user2_id, p_status, p_active_module_id)
  ON CONFLICT (event_id, user1_id, user2_id, active_module_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING match_id INTO v_match_id;

  RETURN v_match_id;
END;
$$;
