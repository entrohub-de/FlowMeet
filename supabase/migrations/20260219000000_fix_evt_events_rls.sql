-- Fix evt_events RLS policies: restrict mutations to host/admin roles
--
-- Previously, INSERT allowed regular users to create small events (≤5 participants),
-- and UPDATE/DELETE allowed any host (not just the creator) to modify events.
-- This migration tightens policies so that:
--   SELECT: open to all authenticated users (public event listing)
--   INSERT: only host or admin role
--   UPDATE: only the event creator (created_by = auth.uid()) OR admin
--   DELETE: only the event creator (created_by = auth.uid()) OR admin

-- ============================================================================
-- 1) Create a SECURITY DEFINER helper to check user role
--    This bypasses RLS on usr_role so policies can reliably read roles.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_host_or_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT ur.role INTO v_role
  FROM public.usr_role AS ur
  WHERE ur.user_id = check_user_id
  LIMIT 1;
  RETURN COALESCE(v_role, 'user') IN ('host', 'admin');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT ur.role INTO v_role
  FROM public.usr_role AS ur
  WHERE ur.user_id = check_user_id
  LIMIT 1;
  RETURN COALESCE(v_role, 'user') = 'admin';
END;
$$;

-- ============================================================================
-- 2) Drop existing evt_events mutation policies
-- ============================================================================
DROP POLICY IF EXISTS "evt_events_select_all" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_insert_with_role_check" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_insert_authenticated" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_update_owner_or_host" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_update_authenticated" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_delete_owner_or_host" ON public.evt_events;
DROP POLICY IF EXISTS "evt_events_delete_authenticated" ON public.evt_events;

-- ============================================================================
-- 3) Create new restrictive policies
-- ============================================================================

-- SELECT: all authenticated users can view events (public listing)
CREATE POLICY "evt_events_select_all"
  ON public.evt_events
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: only host or admin can create events, must set created_by = self
CREATE POLICY "evt_events_insert_host_or_admin"
  ON public.evt_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_host_or_admin(auth.uid())
  );

-- UPDATE: only the event creator OR admin can update
CREATE POLICY "evt_events_update_creator_or_admin"
  ON public.evt_events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- DELETE: only the event creator OR admin can delete
CREATE POLICY "evt_events_delete_creator_or_admin"
  ON public.evt_events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- ============================================================================
-- 4) Comments
-- ============================================================================
COMMENT ON FUNCTION public.is_host_or_admin(UUID) IS 'SECURITY DEFINER helper: returns true if user has host or admin role';
COMMENT ON FUNCTION public.is_admin(UUID) IS 'SECURITY DEFINER helper: returns true if user has admin role';
COMMENT ON POLICY "evt_events_select_all" ON public.evt_events IS 'All authenticated users can view events';
COMMENT ON POLICY "evt_events_insert_host_or_admin" ON public.evt_events IS 'Only host or admin can create events';
COMMENT ON POLICY "evt_events_update_creator_or_admin" ON public.evt_events IS 'Only event creator or admin can update';
COMMENT ON POLICY "evt_events_delete_creator_or_admin" ON public.evt_events IS 'Only event creator or admin can delete';
