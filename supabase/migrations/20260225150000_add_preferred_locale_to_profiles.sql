ALTER TABLE usr_profiles
  ADD COLUMN IF NOT EXISTS preferred_locale TEXT DEFAULT 'zh';
