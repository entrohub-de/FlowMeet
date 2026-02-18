import { supabase } from '../supabase/client';
import type { Match, MatchPreference, Profile, Preferences } from '@/types/domain';
import type { UserWithPreferences, MatchScore } from './matching-algorithm';

interface UserProfile {
  user_id: string;
  nickname: string;
  gender: string;
  age_group: string;
  [key: string]: unknown;
}

/**
 * 获取用户在某个活动的配对偏好
 */
export async function getMatchPreference(
  eventId: string,
  userId: string
): Promise<MatchPreference | null> {
  const { data, error } = await supabase
    .from('match_preferences')
    .select('preference_id, event_id, user_id, preferred_topics, availability, notes, networking_intent, created_at, updated_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching match preference:', error);
    return null;
  }

  return data;
}

/**
 * 保存或更新配对偏好
 */
export async function saveMatchPreference(
  eventId: string,
  userId: string,
  preference: {
    preferred_topics?: string;
    availability?: string;
    notes?: string;
    networking_intent?: string;
  }
): Promise<boolean> {
  const { error } = await supabase.from('match_preferences').upsert(
    {
      event_id: eventId,
      user_id: userId,
      ...preference,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'event_id,user_id',
    }
  );

  if (error) {
    console.error('Error saving match preference:', error);
    return false;
  }

  return true;
}

/**
 * 获取用户在某个活动的所有配对
 */
export async function getUserMatches(
  eventId: string,
  userId: string
): Promise<Match[]> {
  // 先获取配对记录
  const { data: matches, error: matchError } = await supabase
    .from('match_records')
    .select('*')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (matchError) {
    console.error('Error fetching user matches:', matchError);
    return [];
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  // 获取所有相关用户的profiles
  const userIds = new Set<string>();
  matches.forEach((match) => {
    userIds.add(match.user1_id);
    userIds.add(match.user2_id);
  });

  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('id, created_at, user_id, nickname, gender, age_group, avatar_url')
    .in('user_id', Array.from(userIds));

  // 合并数据
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return matches.map((match) => ({
    ...match,
    user1_profile: profileMap.get(match.user1_id),
    user2_profile: profileMap.get(match.user2_id),
  }));
}

/**
 * 发起配对请求
 */
export async function requestMatch(
  eventId: string,
  user1Id: string,
  user2Id: string
): Promise<boolean> {
  const { error } = await supabase.from('match_records').insert({
    event_id: eventId,
    user1_id: user1Id,
    user2_id: user2Id,
    status: 'pending',
  });

  if (error) {
    console.error('Error requesting match:', error);
    return false;
  }

  return true;
}

/**
 * 接受配对请求
 */
export async function acceptMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('match_records')
    .update({
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('match_id', matchId);

  if (error) {
    console.error('Error accepting match:', error);
    return false;
  }

  return true;
}

/**
 * 拒绝配对请求
 */
export async function declineMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('match_records')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('match_id', matchId);

  if (error) {
    console.error('Error declining match:', error);
    return false;
  }

  return true;
}

/**
 * 完成配对（标记为已完成交流）
 */
export async function completeMatch(matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from('match_records')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('match_id', matchId);

  if (error) {
    console.error('Error completing match:', error);
    return false;
  }

  return true;
}

/**
 * 获取可配对的用户列表（已签到但未配对的用户）
 */
export async function getAvailableUsers(
  eventId: string,
  currentUserId: string
): Promise<UserProfile[]> {
  // 获取该活动的所有session
  const { data: sessions, error: sessionError } = await supabase
    .from('session_flows')
    .select('session_id')
    .eq('event_id', eventId);

  if (sessionError) {
    console.error('Error fetching sessions:', sessionError);
    return [];
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.session_id);

  // 获取已签到的用户
  const { data: assignments, error: assignmentError } = await supabase
    .from('evt_assignments')
    .select('user_id')
    .in('session_id', sessionIds)
    .eq('checked_in', true);

  if (assignmentError) {
    console.error('Error fetching checked-in users:', assignmentError);
    return [];
  }

  const checkedInUserIds = [...new Set(assignments?.map((a) => a.user_id) || [])];

  // 获取当前用户已配对的用户ID
  const { data: existingMatches, error: matchError } = await supabase
    .from('match_records')
    .select('user1_id, user2_id')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

  if (matchError) {
    console.error('Error fetching existing matches:', matchError);
    return [];
  }

  const matchedUserIds = new Set<string>();
  existingMatches?.forEach((match) => {
    if (match.user1_id === currentUserId) {
      matchedUserIds.add(match.user2_id);
    } else {
      matchedUserIds.add(match.user1_id);
    }
  });

  // 过滤出可配对的用户ID
  const availableUserIds = checkedInUserIds.filter(
    (id) => id !== currentUserId && !matchedUserIds.has(id)
  );

  if (availableUserIds.length === 0) {
    return [];
  }

  // 获取这些用户的资料
  const { data: profiles, error: profileError } = await supabase
    .from('usr_profiles')
    .select('id, created_at, user_id, nickname, gender, age_group, avatar_url')
    .in('user_id', availableUserIds);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return [];
  }

  return profiles || [];
}

/**
 * 调用后端 Edge Function 获取智能匹配推荐
 */
export async function getMatchRecommendations(
  eventId: string
): Promise<MatchScore[]> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No active session');
      return [];
    }

    const { data, error } = await supabase.functions.invoke('get-match-recommendations', {
      body: { eventId },
    });

    if (error) {
      console.error('Error fetching match recommendations:', error);
      return [];
    }

    return data?.recommendations || [];
  } catch (error) {
    console.error('Error calling match recommendations function:', error);
    return [];
  }
}

/**
 * @deprecated 此函数已弃用，请使用 getMatchRecommendations 调用后端 API
 * 获取可配对用户的完整信息（包括资料和偏好）
 */
export async function getAvailableUsersWithPreferences(
  eventId: string,
  currentUserId: string
): Promise<UserWithPreferences[]> {
  // 获取该活动的所有session
  const { data: sessions, error: sessionError } = await supabase
    .from('session_flows')
    .select('session_id')
    .eq('event_id', eventId);

  if (sessionError) {
    console.error('Error fetching sessions:', sessionError);
    return [];
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  const sessionIds = sessions.map((s) => s.session_id);

  // 获取已签到的用户
  const { data: assignments, error: assignmentError } = await supabase
    .from('evt_assignments')
    .select('user_id')
    .in('session_id', sessionIds)
    .eq('checked_in', true);

  if (assignmentError) {
    console.error('Error fetching checked-in users:', assignmentError);
    return [];
  }

  const checkedInUserIds = [...new Set(assignments?.map((a) => a.user_id) || [])];

  // 获取当前用户已配对的用户ID（如果表不存在则跳过）
  const matchedUserIds = new Set<string>();
  try {
    const { data: existingMatches, error: matchError } = await supabase
      .from('match_records')
      .select('user1_id, user2_id')
      .eq('event_id', eventId)
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

    if (!matchError && existingMatches) {
      existingMatches.forEach((match) => {
        if (match.user1_id === currentUserId) {
          matchedUserIds.add(match.user2_id);
        } else {
          matchedUserIds.add(match.user1_id);
        }
      });
    }
  } catch {
    console.log('Matches table not available, showing all users');
  }

  // 过滤出可配对的用户ID
  const availableUserIds = checkedInUserIds.filter(
    (id) => id !== currentUserId && !matchedUserIds.has(id)
  );

  if (availableUserIds.length === 0) {
    return [];
  }

  // 获取这些用户的资料和偏好
  const { data: profiles, error: profileError } = await supabase
    .from('usr_profiles')
    .select('id, created_at, user_id, nickname, gender, age_group, avatar_url')
    .in('user_id', availableUserIds);

  if (profileError) {
    console.error('Error fetching profiles:', profileError);
    return [];
  }

  const { data: preferences, error: prefError } = await supabase
    .from('usr_preferences')
    .select('id, created_at, user_id, languages, interests, industry_background, startup_stage')
    .in('user_id', availableUserIds);

  if (prefError) {
    console.error('Error fetching preferences:', prefError);
  }

  // 合并资料和偏好
  const usersWithPreferences: UserWithPreferences[] = profiles?.map((profile) => ({
    profile: profile as Profile,
    preferences: (preferences?.find((pref) => pref.user_id === profile.user_id) as Preferences) || null,
  })) || [];

  return usersWithPreferences;
}

/**
 * 获取当前用户的资料和偏好
 */
export async function getCurrentUserWithPreferences(userId: string): Promise<UserWithPreferences | null> {
  // 获取profile，如果有多个则取第一个
  const { data: profiles, error: profileError } = await supabase
    .from('usr_profiles')
    .select('id, created_at, user_id, nickname, gender, age_group, avatar_url')
    .eq('user_id', userId)
    .limit(1);

  if (profileError || !profiles || profiles.length === 0) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }

  const profile = profiles[0];

  // 获取preferences
  const { data: preferences, error: prefError } = await supabase
    .from('usr_preferences')
    .select('id, created_at, user_id, languages, interests, industry_background, startup_stage')
    .eq('user_id', userId)
    .limit(1);

  if (prefError && prefError.code !== 'PGRST116') {
    // PGRST116 是 "no rows returned" 错误，这是正常的
    console.error('Error fetching user preferences:', prefError);
  }

  return {
    profile: profile as Profile,
    preferences: preferences && preferences.length > 0 ? (preferences[0] as Preferences) : null,
  };
}

/**
 * 更新配对中当前用户的位置描述（可选区域）
 */
export async function updateMatchLocation(
  matchId: string,
  location: string,
  areaId?: string | null
): Promise<boolean> {
  try {
    // 获取当前用户ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('No active session');
      return false;
    }

    const userId = session.user.id;

    // 获取配对信息以确定是user1还是user2
    const { data: match, error: fetchError } = await supabase
      .from('match_records')
      .select('user1_id, user2_id')
      .eq('match_id', matchId)
      .single();

    if (fetchError || !match) {
      console.error('Error fetching match:', fetchError);
      return false;
    }

    // 确定要更新的字段
    let updateData: Record<string, string | null> = {};
    if (match.user1_id === userId) {
      updateData = {
        user1_location: location,
        location_updated_by_user1_at: new Date().toISOString(),
        ...(areaId !== undefined ? { user1_area_id: areaId ?? null } : {}),
      };
    } else if (match.user2_id === userId) {
      updateData = {
        user2_location: location,
        location_updated_by_user2_at: new Date().toISOString(),
        ...(areaId !== undefined ? { user2_area_id: areaId ?? null } : {}),
      };
    } else {
      console.error('User is not part of this match');
      return false;
    }

    // 更新位置
    const { error: updateError } = await supabase
      .from('match_records')
      .update(updateData)
      .eq('match_id', matchId);

    if (updateError) {
      console.error('Error updating match location:', updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error updating match location:', error);
    return false;
  }
}

/**
 * 订阅配对位置变更（实时）
 */
export function subscribeToMatchLocation(
  matchId: string,
  callback: (match: {
    user1_location: string | null;
    user2_location: string | null;
    user1_area_id: string | null;
    user2_area_id: string | null;
    location_updated_by_user1_at: string | null;
    location_updated_by_user2_at: string | null;
  }) => void
) {
  const channel = supabase
    .channel(`match-location:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'match_records',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        callback({
          user1_location: (row.user1_location as string) ?? null,
          user2_location: (row.user2_location as string) ?? null,
          user1_area_id: (row.user1_area_id as string) ?? null,
          user2_area_id: (row.user2_area_id as string) ?? null,
          location_updated_by_user1_at: (row.location_updated_by_user1_at as string) ?? null,
          location_updated_by_user2_at: (row.location_updated_by_user2_at as string) ?? null,
        });
      }
    )
    .subscribe();

  return channel;
}

export interface FamiliarFace {
  profile: Profile;
  previousEventName: string;
  previousMatchDate: string;
}

/**
 * 弱关系激活：查找当前活动中曾在其他活动中配对过的用户
 */
export async function getFamiliarFaces(
  eventId: string,
  userId: string
): Promise<FamiliarFace[]> {
  // 1. Get all users signed up for this event
  const { data: signups } = await supabase
    .from('evt_signups')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (!signups || signups.length === 0) return [];

  const eventUserIds = signups.map((s) => s.user_id).filter((id) => id !== userId);
  if (eventUserIds.length === 0) return [];

  // 2. Get all previous matches of the current user from OTHER events
  const { data: previousMatches } = await supabase
    .from('match_records')
    .select('user1_id, user2_id, event_id, created_at')
    .neq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .in('status', ['accepted', 'completed']);

  if (!previousMatches || previousMatches.length === 0) return [];

  // 3. Find intersection: users who are both in this event AND were previously matched
  const familiarUserMap = new Map<string, { eventId: string; matchDate: string }>();
  for (const match of previousMatches) {
    const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
    if (eventUserIds.includes(partnerId) && !familiarUserMap.has(partnerId)) {
      familiarUserMap.set(partnerId, {
        eventId: match.event_id,
        matchDate: match.created_at,
      });
    }
  }

  if (familiarUserMap.size === 0) return [];

  // 4. Fetch profiles and event names
  const familiarIds = Array.from(familiarUserMap.keys());

  const [{ data: profiles }, { data: events }] = await Promise.all([
    supabase.from('usr_profiles').select('id, created_at, user_id, nickname, gender, age_group, avatar_url').in('user_id', familiarIds),
    supabase
      .from('evt_events')
      .select('event_id, name')
      .in('event_id', Array.from(new Set([...familiarUserMap.values()].map((v) => v.eventId)))),
  ]);

  const eventNameMap = new Map<string, string>();
  events?.forEach((e) => eventNameMap.set(e.event_id, e.name));

  const results: FamiliarFace[] = [];
  for (const [uid, info] of familiarUserMap) {
    const profile = profiles?.find((p) => p.user_id === uid);
    if (profile) {
      results.push({
        profile: profile as Profile,
        previousEventName: eventNameMap.get(info.eventId) ?? '',
        previousMatchDate: info.matchDate,
      });
    }
  }

  return results;
}
