-- Add RLS policies for usr_preferences table
-- The table has RLS enabled but no policies, so all operations are denied

-- Allow authenticated users to read their own preferences
CREATE POLICY "usr_preferences_select_own"
  ON public.usr_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow authenticated users to insert their own preferences
CREATE POLICY "usr_preferences_insert_own"
  ON public.usr_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to update their own preferences
CREATE POLICY "usr_preferences_update_own"
  ON public.usr_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
