-- Fix ON DELETE RESTRICT constraints that prevent user deletion
-- Change to SET NULL so workflow data is preserved when a user is deleted

-- 1) workflow_event_steps.created_by: RESTRICT → SET NULL
ALTER TABLE public.workflow_event_steps
  DROP CONSTRAINT workflow_event_steps_created_by_fkey;
ALTER TABLE public.workflow_event_steps
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.workflow_event_steps
  ADD CONSTRAINT workflow_event_steps_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) workflow_templates.created_by: RESTRICT → SET NULL
ALTER TABLE public.workflow_templates
  DROP CONSTRAINT workflow_templates_created_by_fkey;
ALTER TABLE public.workflow_templates
  ALTER COLUMN created_by DROP NOT NULL,
  ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE public.workflow_templates
  ADD CONSTRAINT workflow_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3) usr_host_applications.reviewed_by: default(NO ACTION) → SET NULL
ALTER TABLE public.usr_host_applications
  DROP CONSTRAINT IF EXISTS usr_host_applications_reviewed_by_fkey;
ALTER TABLE public.usr_host_applications
  ADD CONSTRAINT usr_host_applications_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
