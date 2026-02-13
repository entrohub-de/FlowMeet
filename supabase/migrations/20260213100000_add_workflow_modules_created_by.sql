-- Add created_by column to workflow_modules so custom modules are tied to users.
-- NULL created_by = system/seed module; non-NULL = user-created custom module.

ALTER TABLE public.workflow_modules
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_workflow_modules_created_by
  ON public.workflow_modules(created_by);

-- Allow users to also see their own custom modules (even if is_active = false)
DROP POLICY IF EXISTS "workflow_modules_select_own" ON public.workflow_modules;
CREATE POLICY "workflow_modules_select_own"
  ON public.workflow_modules
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Allow authenticated users to insert their own custom modules
DROP POLICY IF EXISTS "workflow_modules_insert_own" ON public.workflow_modules;
CREATE POLICY "workflow_modules_insert_own"
  ON public.workflow_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to update only their own custom modules
DROP POLICY IF EXISTS "workflow_modules_update_own" ON public.workflow_modules;
CREATE POLICY "workflow_modules_update_own"
  ON public.workflow_modules
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Allow authenticated users to delete only their own custom modules
DROP POLICY IF EXISTS "workflow_modules_delete_own" ON public.workflow_modules;
CREATE POLICY "workflow_modules_delete_own"
  ON public.workflow_modules
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
