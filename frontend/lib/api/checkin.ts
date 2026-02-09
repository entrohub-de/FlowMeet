import { supabase } from '@/lib/supabase/client';

export interface CheckinStatus {
  event_id: string;
  session_id: string;
  checked_in: boolean;
  checked_in_at?: string;
}

/**
 * 获取用户在某个活动的签到状态
 */
export async function getUserCheckinStatus(
  userId: string,
  eventId: string
): Promise<CheckinStatus[]> {
  const { data, error } = await supabase
    .from('evt_assignments')
    .select('session_id, checked_in, assigned_at')
    .eq('user_id', userId)
    .eq('session_id', eventId);

  if (error) throw error;

  return (data || []).map(item => ({
    event_id: eventId,
    session_id: item.session_id,
    checked_in: item.checked_in || false,
    checked_in_at: item.assigned_at,
  }));
}

/**
 * 获取用户所有活动的签到状态
 */
export async function getAllUserCheckinStatuses(
  userId: string
): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('evt_assignments')
    .select('session_id, checked_in')
    .eq('user_id', userId);

  if (error) throw error;

  const statusMap = new Map<string, boolean>();
  (data || []).forEach(item => {
    statusMap.set(item.session_id, item.checked_in || false);
  });

  return statusMap;
}

/**
 * 执行签到操作
 */
export async function checkIn(
  userId: string,
  eventId: string,
  checkinCode: string
): Promise<boolean> {
  // 首先验证签到码
  const { data: event, error: eventError } = await supabase
    .from('evt_events')
    .select('checkin_code')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event || event.checkin_code !== checkinCode) {
    throw new Error('Invalid checkin code');
  }

  // 更新签到状态
  const { error: updateError } = await supabase
    .from('evt_assignments')
    .update({ checked_in: true })
    .eq('user_id', userId)
    .eq('session_id', eventId);

  if (updateError) throw updateError;

  return true;
}
