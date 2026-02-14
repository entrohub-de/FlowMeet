import { supabase } from '@/lib/supabase/client';
import type { Profile, Preferences } from '@/types/domain';

export async function isProfileComplete(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('usr_profiles')
    .select('nickname')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return false;
  return !!data.nickname && data.nickname.trim().length > 0;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('usr_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertProfile(
  userId: string,
  profile: Partial<Pick<Profile, 'nickname' | 'gender' | 'age_group' | 'avatar_url'>>
): Promise<Profile> {
  const { data, error } = await supabase
    .from('usr_profiles')
    .upsert({ user_id: userId, ...profile }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPreferences(userId: string): Promise<Preferences | null> {
  const { data, error } = await supabase
    .from('usr_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertPreferences(
  userId: string,
  prefs: Partial<Pick<Preferences, 'languages' | 'interests' | 'industry_background' | 'startup_stage'>>
): Promise<Preferences> {
  const payload = { user_id: userId, ...prefs };
  console.log('[upsertPreferences] payload:', payload);
  const { data, error, status, statusText } = await supabase
    .from('usr_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  console.log('[upsertPreferences] status:', status, statusText, 'data:', data, 'error:', error);
  if (error) throw error;
  return data;
}
