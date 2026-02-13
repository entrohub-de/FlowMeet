-- Allow hosts/admins to insert matches on behalf of participants
-- (needed for automatic 1v1 matching during live flow steps)
CREATE POLICY "Hosts can create matches for event participants"
  ON public.evt_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('host', 'admin'));

-- Allow hosts/admins to view all matches for events
CREATE POLICY "Hosts can view all matches"
  ON public.evt_matches
  FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('host', 'admin'));
