import { supabase } from '@/lib/supabase/client';
import type { Announcement } from '@/types/domain';

/**
 * 获取活动的公告列表
 */
export async function getAnnouncements(eventId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('eventId', eventId)
    .order('createdAt', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * 创建新公告
 */
export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert([announcement])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
