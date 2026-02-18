-- Add consent tracking table for DSGVO/GDPR compliance
CREATE TABLE IF NOT EXISTS usr_consent (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  privacy_consent_at timestamptz NOT NULL DEFAULT now(),
  privacy_consent_version text NOT NULL DEFAULT '1.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usr_consent_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE usr_consent ENABLE ROW LEVEL SECURITY;

-- Users can read their own consent record
CREATE POLICY "Users can read own consent"
  ON usr_consent FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own consent record
CREATE POLICY "Users can insert own consent"
  ON usr_consent FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent record
CREATE POLICY "Users can update own consent"
  ON usr_consent FOR UPDATE
  USING (auth.uid() = user_id);
