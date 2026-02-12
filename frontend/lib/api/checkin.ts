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
    .from('evt_signups')
    .select('event_id, checked_in, checked_in_at')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (error) throw error;

  return (data || []).map(item => ({
    event_id: eventId,
    session_id: eventId,
    checked_in: item.checked_in || false,
    checked_in_at: item.checked_in_at,
  }));
}

/**
 * 获取用户所有活动的签到状态
 */
export async function getAllUserCheckinStatuses(
  userId: string
): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('evt_signups')
    .select('event_id, checked_in')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) throw error;

  const statusMap = new Map<string, boolean>();
  (data || []).forEach(item => {
    statusMap.set(item.event_id, item.checked_in || false);
  });

  return statusMap;
}

/**
 * 执行签到操作（用户自助签到）
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

  // 更新签到状态 - 改为更新 evt_signups
  const { error: updateError } = await supabase
    .from('evt_signups')
    .update({
      checked_in: true,
      checked_in_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (updateError) throw updateError;

  return true;
}

/**
 * 主办方为参与者签到（通过用户ID）
 */
export async function checkInParticipant(
  eventId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // 检查用户是否已报名并获取签到状态
    const { data: signup, error: signupError } = await supabase
      .from('evt_signups')
      .select('signup_id, checked_in')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (signupError) throw signupError;
    if (!signup) {
      return { success: false, message: '用户未报名此活动' };
    }

    if (signup.checked_in) {
      return { success: false, message: '该用户已签到' };
    }

    // 执行签到 - 直接更新 evt_signups
    const { error: updateError } = await supabase
      .from('evt_signups')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (updateError) throw updateError;

    return { success: true, message: '签到成功' };
  } catch (error) {
    console.error('Error checking in participant:', error);
    return { success: false, message: '签到失败，请重试' };
  }
}

/**
 * 生成6位数字签到码（与前端保持一致）
 */
function generateNumericCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const code = Math.abs(hash) % 900000 + 100000;
  return code.toString();
}

/**
 * 解码签到码（支持Base64和旧格式）
 */
function decodeCheckinCode(code: string): { eventId: string; userId: string; checkinCode: string } | null {
  try {
    // 尝试 Base64 解码
    if (!code.includes('/')) {
      const decoded = atob(code);
      const parts = decoded.split('/');
      if (parts.length === 3) {
        return {
          eventId: parts[0],
          userId: parts[1],
          checkinCode: parts[2],
        };
      }
    }

    // 旧格式：直接用斜杠分割
    const parts = code.split('/');
    if (parts.length === 3) {
      return {
        eventId: parts[0],
        userId: parts[1],
        checkinCode: parts[2],
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 主办方通过签到码为参与者签到
 */
export async function checkInByCode(
  eventId: string,
  code: string
): Promise<{ success: boolean; message: string; userName?: string }> {
  try {
    const trimmedCode = code.trim();

    // 检查是否是6位纯数字码
    if (/^\d{6}$/.test(trimmedCode)) {
      // 获取活动的签到码
      const { data: event, error: eventError } = await supabase
        .from('evt_events')
        .select('checkin_code')
        .eq('event_id', eventId)
        .single();

      if (eventError || !event) {
        return { success: false, message: '活动不存在' };
      }

      // 获取所有报名用户
      const { data: signups, error: signupsError } = await supabase
        .from('evt_signups')
        .select('user_id')
        .eq('event_id', eventId)
        .eq('status', 'active');

      if (signupsError || !signups) {
        return { success: false, message: '获取报名信息失败' };
      }

      // 查找匹配的用户
      let matchedUserId: string | null = null;
      for (const signup of signups) {
        const expectedCode = generateNumericCode(eventId, signup.user_id, event.checkin_code);
        if (expectedCode === trimmedCode) {
          matchedUserId = signup.user_id;
          break;
        }
      }

      if (!matchedUserId) {
        return { success: false, message: '无效的签到码' };
      }

      // 获取用户信息
      const { data: profile } = await supabase
        .from('usr_profiles')
        .select('nickname')
        .eq('user_id', matchedUserId)
        .maybeSingle();

      const userName = profile?.nickname || '未知用户';

      // 执行签到
      const result = await checkInParticipant(eventId, matchedUserId);

      return {
        ...result,
        userName,
      };
    }

    // Base64 或旧格式
    const decoded = decodeCheckinCode(trimmedCode);

    if (!decoded) {
      return { success: false, message: '无效的签到码格式' };
    }

    const { eventId: codeEventId, userId, checkinCode } = decoded;

    // 验证活动ID
    if (codeEventId !== eventId) {
      return { success: false, message: '签到码不属于此活动' };
    }

    // 验证签到码
    const { data: event, error: eventError } = await supabase
      .from('evt_events')
      .select('checkin_code')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event || event.checkin_code !== checkinCode) {
      return { success: false, message: '无效的签到码' };
    }

    // 获取用户信息
    const { data: profile } = await supabase
      .from('usr_profiles')
      .select('nickname')
      .eq('user_id', userId)
      .maybeSingle();

    const userName = profile?.nickname || '未知用户';

    // 执行签到
    const result = await checkInParticipant(eventId, userId);

    return {
      ...result,
      userName,
    };
  } catch (error) {
    console.error('Error checking in by code:', error);
    return { success: false, message: '签到失败，请重试' };
  }
}
