-- Ensure custom workflow modules always capture owner when created by authenticated users.
ALTER TABLE public.workflow_modules
  ALTER COLUMN created_by SET DEFAULT auth.uid();
