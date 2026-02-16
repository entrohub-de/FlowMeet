import { supabase } from '@/lib/supabase/client';
import type { Advertisement } from '@/types/domain';

/** Admin: get all advertisements */
export async function getAds(): Promise<Advertisement[]> {
  const { data, error } = await supabase
    .from('ad_advertisements')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/** Get active ads, optionally filtered by event (event-specific + global, within date range) */
export async function getActiveAds(eventId?: string): Promise<Advertisement[]> {
  // Fetch all active ads, then filter in JS to avoid PostgREST .or() chaining issues
  const { data, error } = await supabase
    .from('ad_advertisements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  if (!data) return [];

  const now = new Date();

  return data.filter((ad) => {
    // Check date range
    if (ad.start_date && new Date(ad.start_date) > now) return false;
    if (ad.end_date && new Date(ad.end_date) < now) return false;

    // Check event scope: null or undefined means global
    if (eventId) {
      return ad.event_id === eventId || !ad.event_id;
    }
    return !ad.event_id;
  });
}

/** Create a new advertisement */
export async function createAd(
  ad: Pick<Advertisement, 'title'> & Partial<Omit<Advertisement, 'ad_id' | 'created_at' | 'updated_at'>>
): Promise<Advertisement> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from('ad_advertisements')
    .insert([{ ...ad, created_by: session?.user?.id ?? null }])
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Update an advertisement */
export async function updateAd(
  adId: string,
  updates: Partial<Omit<Advertisement, 'ad_id' | 'created_at' | 'created_by'>>
): Promise<Advertisement> {
  const { data, error } = await supabase
    .from('ad_advertisements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('ad_id', adId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/** Delete an advertisement */
export async function deleteAd(adId: string): Promise<void> {
  const { error } = await supabase
    .from('ad_advertisements')
    .delete()
    .eq('ad_id', adId);

  if (error) throw error;
}
