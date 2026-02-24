-- Increase max_participants limit for regular users from 5 to 20
-- This aligns with the product pivot toward user-created small events

-- Drop the old insert policy
DROP POLICY IF EXISTS "evt_events_insert_with_role_check" ON public.evt_events;

-- Recreate with updated limit (≤20 for regular users)
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
      -- Regular users can create events up to 20 participants
      (max_participants IS NOT NULL AND max_participants <= 20)
    )
  );

COMMENT ON POLICY "evt_events_insert_with_role_check" ON public.evt_events
  IS 'Regular users can create events (≤20), hosts/admins can create any';
