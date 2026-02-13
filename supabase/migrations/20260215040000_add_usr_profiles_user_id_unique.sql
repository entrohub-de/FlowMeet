-- Add unique constraint on usr_profiles.user_id to support upsert with ON CONFLICT
-- First remove duplicate user_id rows (keep the newest one)
DELETE FROM public.usr_profiles a
  USING public.usr_profiles b
  WHERE a.user_id = b.user_id
    AND a.id < b.id;

CREATE UNIQUE INDEX IF NOT EXISTS usr_profiles_user_id_key ON public.usr_profiles USING btree (user_id);
ALTER TABLE public.usr_profiles ADD CONSTRAINT usr_profiles_user_id_key UNIQUE USING INDEX usr_profiles_user_id_key;

-- Add RLS policies for usr_profiles
CREATE POLICY "usr_profiles_select_own"
  ON public.usr_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "usr_profiles_insert_own"
  ON public.usr_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usr_profiles_update_own"
  ON public.usr_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
