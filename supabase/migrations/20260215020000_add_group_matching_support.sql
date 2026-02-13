-- Add step_id to groups for flow-based group matching
ALTER TABLE public.evt_groups ADD COLUMN IF NOT EXISTS step_id TEXT;
CREATE INDEX IF NOT EXISTS idx_evt_groups_step_id ON public.evt_groups(step_id);

-- RPC: host creates a group and returns its ID
CREATE OR REPLACE FUNCTION public.host_upsert_group(
  p_event_id UUID,
  p_name TEXT,
  p_max_size INTEGER,
  p_step_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_group_id UUID;
BEGIN
  SELECT role INTO v_role FROM public.usr_role WHERE user_id = auth.uid();
  IF v_role NOT IN ('host', 'admin') THEN
    RAISE EXCEPTION 'Only hosts or admins can create groups';
  END IF;

  INSERT INTO public.evt_groups (event_id, name, max_size, step_id)
  VALUES (p_event_id, p_name, p_max_size, p_step_id)
  RETURNING group_id INTO v_group_id;

  RETURN v_group_id;
END;
$$;

-- RPC: host adds members to a group
CREATE OR REPLACE FUNCTION public.host_add_group_members(
  p_group_id UUID,
  p_user_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_count INTEGER := 0;
  v_uid UUID;
BEGIN
  SELECT role INTO v_role FROM public.usr_role WHERE user_id = auth.uid();
  IF v_role NOT IN ('host', 'admin') THEN
    RAISE EXCEPTION 'Only hosts or admins can add group members';
  END IF;

  FOREACH v_uid IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.evt_group_members (group_id, user_id)
    VALUES (p_group_id, v_uid)
    ON CONFLICT DO NOTHING;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
