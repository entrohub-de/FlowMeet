-- Remove the policy that allows users to self-upgrade to host
DROP POLICY IF EXISTS "Allow users to update their role to host" ON public.usr_role;

-- Only admins can update roles
CREATE POLICY "Only admins can update roles"
  ON public.usr_role FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Admins can read all roles (required for UPDATE visibility under RLS)
CREATE POLICY "Admins can read all roles"
  ON public.usr_role FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
