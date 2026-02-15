-- Add created_by and max_participants to evt_events
-- Enable regular users to create small events (≤5 participants)
-- Tighten RLS: ownership-based edit/delete, role-based capacity limits

-- ============================================================================
-- 1) Add new columns
-- ============================================================================
ALTER TABLE public.evt_events
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT NULL;

-- Backfill: set created_by for existing events to first host found
UPDATE public.evt_events
SET created_by = (
  SELECT user_id FROM public.usr_role WHERE role IN ('host', 'admin') LIMIT 1
)
WHERE created_by IS NULL;

-- Create index for querying user's own events
CREATE INDEX IF NOT EXISTS idx_evt_events_created_by ON public.evt_events(created_by);

-- ============================================================================
-- 2) Replace RLS policies with ownership-aware ones
-- ============================================================================

-- Drop old permissive policies
DROP POLICY IF EXISTS "evt_events_select_all" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_insert_authenticated" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_update_authenticated" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_delete_authenticated" ON public.evt_events;
DROP POLICY IF EXISTS "Allow public read events" ON public.evt_events;

-- SELECT: Everyone can view all events
CREATE POLICY "evt_events_select_all"
  ON public.evt_events
  FOR SELECT
  TO public
  USING (true);

-- INSERT: Any authenticated user can create events
-- Regular users: max_participants must be ≤ 5 and created_by = self
-- Hosts/admins: no restrictions
CREATE POLICY "evt_events_insert_with_role_check"
  ON public.evt_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Hosts/admins can create any event
      public.get_user_role(auth.uid()) IN ('host', 'admin')
      OR
      -- Regular users can only create small events (≤5 participants)
      (max_participants IS NOT NULL AND max_participants <= 5)
    )
  );

-- UPDATE: Only the creator, hosts, or admins can update
CREATE POLICY "evt_events_update_owner_or_host"
  ON public.evt_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('host', 'admin')
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('host', 'admin')
  );

-- DELETE: Only the creator, hosts, or admins can delete
CREATE POLICY "evt_events_delete_owner_or_host"
  ON public.evt_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('host', 'admin')
  );

-- ============================================================================
-- 3) Add signup limit enforcement via trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_event_signup_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max INTEGER;
  v_current INTEGER;
BEGIN
  -- Get max_participants for the event
  SELECT max_participants INTO v_max
  FROM public.evt_events
  WHERE event_id = NEW.event_id;

  -- If no limit, allow
  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count current active signups (excluding this one if it's an update)
  SELECT COUNT(*) INTO v_current
  FROM public.evt_signups
  WHERE event_id = NEW.event_id
    AND status = 'active'
    AND signup_id != COALESCE(NEW.signup_id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_current >= v_max THEN
    RAISE EXCEPTION 'Event is full (max % participants)', v_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_signup_limit
  BEFORE INSERT OR UPDATE ON public.evt_signups
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.check_event_signup_limit();

-- ============================================================================
-- 4) Comments
-- ============================================================================
COMMENT ON COLUMN public.evt_events.created_by IS 'User who created the event';
COMMENT ON COLUMN public.evt_events.max_participants IS 'Maximum number of participants (NULL = unlimited)';
COMMENT ON POLICY "evt_events_insert_with_role_check" ON public.evt_events
  IS 'Regular users can create small events (≤5), hosts/admins can create any';
COMMENT ON POLICY "evt_events_update_owner_or_host" ON public.evt_events
  IS 'Only event creator, hosts, or admins can update';
COMMENT ON POLICY "evt_events_delete_owner_or_host" ON public.evt_events
  IS 'Only event creator, hosts, or admins can delete';
