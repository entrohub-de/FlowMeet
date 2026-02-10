import { supabase } from '@/lib/supabase/client';

/**
 * 报名参加活动
 */
export async function signupForEvent(eventId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('evt_signups')
      .insert({
        event_id: eventId,
        user_id: userId,
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
 */
export async function cancelSignup(eventId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('evt_signups')
      .delete()
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
 */
export async function getUserSignupStatus(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('evt_signups')
      .select('signup_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected when not signed up
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
 */
export async function getUserSignups(userId: string): Promise<Map<string, boolean>> {
  try {
    const { data, error } = await supabase
      .from('evt_signups')
      .select('event_id')
      .eq('user_id', userId);

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
 */
export async function getEventSignupCount(eventId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('evt_signups')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

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
