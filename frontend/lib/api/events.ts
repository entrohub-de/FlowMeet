import { supabase } from '@/lib/supabase/client';
import type { Event } from '@/types/domain';

/**
 * 获取所有活动
 */
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

/**
 * 获取单个活动详情
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select('*')
    .eq('id', eventId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 创建活动
 */
export async function createEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  const { data, error } = await supabase
    .from('evt_events')
    .insert([event])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
