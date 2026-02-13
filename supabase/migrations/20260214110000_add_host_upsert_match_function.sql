-- Create a SECURITY DEFINER function so the host can insert/upsert matches
-- bypassing RLS (the function itself checks the caller is host/admin).
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
  -- Verify caller is host or admin
  SELECT role INTO v_role
    FROM public.usr_role
   WHERE user_id = auth.uid()
   LIMIT 1;

  IF COALESCE(v_role, 'user') NOT IN ('host', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: only hosts can create matches';
  END IF;

  INSERT INTO public.evt_matches (event_id, user1_id, user2_id, status)
  VALUES (p_event_id, p_user1_id, p_user2_id, p_status)
  ON CONFLICT (event_id, user1_id, user2_id)
  DO UPDATE SET status = EXCLUDED.status, updated_at = now()
  RETURNING match_id INTO v_match_id;

  RETURN v_match_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.host_upsert_match(uuid, uuid, uuid, varchar) TO authenticated;
