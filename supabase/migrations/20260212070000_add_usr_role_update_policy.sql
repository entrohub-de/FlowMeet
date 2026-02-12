-- Add UPDATE policy for usr_role table
-- Allows users to upgrade their own role from 'user' to 'host'

-- Create UPDATE policy
CREATE POLICY "Allow users to update their role to host"
  ON "public"."usr_role"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    -- User can only update their own role
    auth.uid() = user_id
  )
  WITH CHECK (
    -- User can only update their own role
    auth.uid() = user_id
    -- User can only upgrade from 'user' to 'host', not to 'admin'
    AND role IN ('user', 'host')
  );

-- Add comment
COMMENT ON POLICY "Allow users to update their role to host" ON "public"."usr_role" IS
  'Allows users to upgrade their role from user to host. Admin role can only be assigned by system.';
