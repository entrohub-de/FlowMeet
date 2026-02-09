import { supabase } from '@/lib/supabase/client';
import type { Event } from '@/types/domain';

/**
 * 获取所有活动（关联场地信息）
 */
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*, venue:evt_venues(venue_id, name, capacity, created_at)');

  if (error) throw error;
  return data || [];
}

/**
 * 获取单个活动详情
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*, venue:evt_venues(venue_id, name, capacity, created_at)')
    .eq('event_id', eventId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 创建活动
 */
export async function createEvent(
  event: Pick<Event, 'name' | 'description' | 'start_time' | 'end_time' | 'venue_id'>
): Promise<Event> {
  const { data, error } = await supabase
    .from('evt_events')
    .insert([event])
    .select('*, venue:evt_venues(venue_id, name, capacity, created_at)')
    .single();

  if (error) throw error;
  return data;
}
