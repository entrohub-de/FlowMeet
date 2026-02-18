import { supabase } from '@/lib/supabase/client';

const CURRENT_PRIVACY_POLICY_VERSION = '1.0';

export async function recordConsent(userId: string, version?: string): Promise<void> {
  const { error } = await supabase
    .from('usr_consent')
    .upsert(
      {
        user_id: userId,
        privacy_consent_at: new Date().toISOString(),
        privacy_consent_version: version || CURRENT_PRIVACY_POLICY_VERSION,
      },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function getConsent(userId: string): Promise<{ privacy_consent_at: string; privacy_consent_version: string } | null> {
  const { data, error } = await supabase
    .from('usr_consent')
    .select('privacy_consent_at, privacy_consent_version')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export { CURRENT_PRIVACY_POLICY_VERSION };
