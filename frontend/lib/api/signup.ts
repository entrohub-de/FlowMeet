import { supabase } from '@/lib/supabase/client';

/**
 * 报名参加活动
 * 如果用户之前取消过，则将状态改为 active
 */
export async function signupForEvent(eventId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('evt_signups')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status: 'active',
      }, {
        onConflict: 'event_id,user_id',
      });

    if (error) {
      console.error('Error signing up for event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error signing up for event:', error);
    return false;
  }
}

/**
 * 取消报名
 * 不删除记录，而是将状态改为 cancelled
 */
export async function cancelSignup(eventId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('evt_signups')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error canceling signup:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error canceling signup:', error);
    return false;
  }
}

/**
 * 获取用户对某个活动的报名状态
 * 只返回 active 状态的报名
 */
export async function getUserSignupStatus(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('evt_signups')
      .select('signup_id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error getting signup status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error getting signup status:', error);
    return false;
  }
}

/**
 * 获取用户所有报名的活动
 * 只返回 active 状态的报名
 */
export async function getUserSignups(userId: string): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('evt_signups')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Error getting user signups:', error);
      return new Map();
    }

    const signupMap = new Map<string, boolean>();
    data?.forEach((signup) => {
      signupMap.set(signup.event_id, true);
    });

    return signupMap;
  } catch (error) {
    console.error('Error getting user signups:', error);
    return new Map();
  }
}

/**
 * 获取某个活动的报名人数
 * 只计算 active 状态的报名
 */
export async function getEventSignupCount(eventId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('evt_signups')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'active');

    if (error) {
      console.error('Error getting signup count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting signup count:', error);
    return 0;
  }
}

/**
 * 获取用户已报名的活动详情列表
 * 只返回 active 状态的报名
 */
export async function getUserSignedUpEvents(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('evt_signups')
      .select('event:evt_events(*, venue:evt_venues(venue_id, name, capacity, created_at))')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error('Error getting user signed up events:', error);
      return [];
    }

    return (data?.map((item: any) => item.event).filter(Boolean) || []) as any[];
  } catch (error) {
    console.error('Error getting user signed up events:', error);
    return [];
  }
}
