import { supabase } from '@/lib/supabase/client';
import type { Event } from '@/types/domain';

/**
 * 获取所有活动（关联场地信息）
 */
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*, venue:evt_venues(venue_id, name, capacity, created_at)')
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * 获取单个活动详情（通过 event_id）
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
 * 获取单个活动详情（通过 event_code）
 * 使用短代码查询，适合 URL 路由
 */
export async function getEventByCode(eventCode: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*, venue:evt_venues(venue_id, name, capacity, created_at)')
    .eq('event_code', eventCode)
    .maybeSingle();

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

/**
 * 删除活动
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('evt_events')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
}
