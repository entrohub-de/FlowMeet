import { supabase } from '@/lib/supabase/client';
import type { Venue, Area } from '@/types/domain';

// ─── Venues ───

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from('evt_venues')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching venues:', error);
    return [];
  }
  return data ?? [];
}

export async function getVenue(venueId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('evt_venues')
    .select('*')
    .eq('venue_id', venueId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching venue:', error);
    return null;
  }
  return data;
}

export async function createVenue(venue: {
  name: string;
  capacity: number;
  address?: string;
  description?: string;
}): Promise<Venue | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('evt_venues')
    .insert({ ...venue, created_by: session?.user?.id })
    .select()
    .single();

  if (error) {
    console.error('Error creating venue:', error);
    return null;
  }
  return data;
}

export async function updateVenue(
  venueId: string,
  venue: Partial<Pick<Venue, 'name' | 'capacity' | 'address' | 'description'>>
): Promise<Venue | null> {
  const { data, error } = await supabase
    .from('evt_venues')
    .update(venue)
    .eq('venue_id', venueId)
    .select()
    .single();

  if (error) {
    console.error('Error updating venue:', error);
    return null;
  }
  return data;
}

export async function deleteVenue(venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from('evt_venues')
    .delete()
    .eq('venue_id', venueId);

  if (error) {
    console.error('Error deleting venue:', error);
    return false;
  }
  return true;
}

// ─── Areas ───

export async function getVenueAreas(venueId: string): Promise<Area[]> {
  const { data, error } = await supabase
    .from('evt_areas')
    .select('*')
    .eq('venue_id', venueId)
    .order('area_order', { ascending: true });

  if (error) {
    console.error('Error fetching areas:', error);
    return [];
  }
  return data ?? [];
}

export async function createArea(area: {
  venue_id: string;
  name: string;
  description?: string;
  max_people?: number;
  min_people?: number;
  area_type?: string;
  area_order?: number;
}): Promise<Area | null> {
  const { data, error } = await supabase
    .from('evt_areas')
    .insert(area)
    .select()
    .single();

  if (error) {
    console.error('Error creating area:', error);
    return null;
  }
  return data;
}

export async function updateArea(
  areaId: string,
  area: Partial<Pick<Area, 'name' | 'description' | 'max_people' | 'min_people' | 'area_type' | 'area_order'>>
): Promise<Area | null> {
  const { data, error } = await supabase
    .from('evt_areas')
    .update(area)
    .eq('area_id', areaId)
    .select()
    .single();

  if (error) {
    console.error('Error updating area:', error);
    return null;
  }
  return data;
}

export async function deleteArea(areaId: string): Promise<boolean> {
  const { error } = await supabase
    .from('evt_areas')
    .delete()
    .eq('area_id', areaId);

  if (error) {
    console.error('Error deleting area:', error);
    return false;
  }
  return true;
}

// ─── Helper: get areas for an event via its venue ───

export async function getEventVenueAreas(eventId: string): Promise<Area[]> {
  // First get the event's venue_id
  const { data: event, error: eventError } = await supabase
    .from('evt_events')
    .select('venue_id')
    .eq('event_id', eventId)
    .maybeSingle();

  if (eventError || !event?.venue_id) return [];

  return getVenueAreas(event.venue_id);
}
