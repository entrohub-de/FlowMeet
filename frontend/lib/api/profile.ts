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
  profile: Partial<Pick<Profile, 'nickname' | 'gender' | 'age_group'>>
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
  prefs: Partial<Pick<Preferences, 'languages' | 'interests' | 'purpose' | 'industry_background'>>
): Promise<Preferences> {
  const { data, error } = await supabase
    .from('usr_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
