-- Rename match-related tables: evt_matches → match_records, evt_match_preferences → match_preferences
-- All match-related tables now use the match_ domain prefix

-- ============================================================================
-- 1) Rename tables
-- ============================================================================
ALTER TABLE public.evt_matches RENAME TO match_records;
ALTER TABLE public.evt_match_preferences RENAME TO match_preferences;

-- ============================================================================
-- 2) Rename foreign key constraints (used by Supabase PostgREST joins)
-- ============================================================================
ALTER TABLE public.match_records RENAME CONSTRAINT evt_matches_event_id_fkey TO match_records_event_id_fkey;
ALTER TABLE public.match_records RENAME CONSTRAINT evt_matches_user1_id_fkey TO match_records_user1_id_fkey;
ALTER TABLE public.match_records RENAME CONSTRAINT evt_matches_user2_id_fkey TO match_records_user2_id_fkey;

ALTER TABLE public.match_preferences RENAME CONSTRAINT evt_match_preferences_event_id_fkey TO match_preferences_event_id_fkey;
ALTER TABLE public.match_preferences RENAME CONSTRAINT evt_match_preferences_user_id_fkey TO match_preferences_user_id_fkey;

-- ============================================================================
-- 3) Update host_upsert_match function to reference new table name
-- ============================================================================
CREATE OR REPLACE FUNCTION public.host_upsert_match(
  p_event_id uuid,
  p_user1_id uuid,
  p_user2_id uuid,
  p_status varchar DEFAULT 'accepted'
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

  INSERT INTO public.match_records (event_id, user1_id, user2_id, status)
  VALUES (p_event_id, p_user1_id, p_user2_id, p_status)
  ON CONFLICT (event_id, user1_id, user2_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING match_id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

-- Note: ALTER TABLE RENAME automatically updates supabase_realtime publication references
