-- Add profile_completed_at to usr_profiles for tracking profile completion
ALTER TABLE public.usr_profiles ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ;
