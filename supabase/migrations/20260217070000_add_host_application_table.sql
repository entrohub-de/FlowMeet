-- Host Application table: users apply to become hosts, admins approve/reject
CREATE TABLE public.usr_host_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.usr_host_applications ENABLE ROW LEVEL SECURITY;

-- Users can insert their own application
CREATE POLICY "Users can insert own application"
  ON public.usr_host_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own application
CREATE POLICY "Users can read own application"
  ON public.usr_host_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all applications
CREATE POLICY "Admins can read all applications"
  ON public.usr_host_applications FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
  ON public.usr_host_applications FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) = 'admin');
