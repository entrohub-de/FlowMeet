-- Fix: allow authenticated users to read all profiles
-- Previously only "select_own" existed, which blocked reading partner profiles
-- in matching flows, causing "匿名用户" to be displayed instead of real nicknames.

DROP POLICY IF EXISTS "usr_profiles_select_own" ON public.usr_profiles;

CREATE POLICY "usr_profiles_select_authenticated"
  ON public.usr_profiles FOR SELECT
  TO authenticated
  USING (true);
