import { supabase } from '../supabase/client';
import type { Match, Profile } from '@/types/domain';

export interface Connection {
  user_id: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
  event_name: string;
  event_id: string;
  match_id: string;
  matched_at: string;
}

/**
 * 获取当前用户的所有线上连接（跨活动的已完成/已接受配对）
 */
export async function getUserConnections(userId: string): Promise<Connection[]> {
  // 获取所有已接受或已完成的配对
  const { data: matches, error: matchError } = await supabase
    .from('match_records')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .in('status', ['accepted', 'completed'])
    .order('created_at', { ascending: false });

  if (matchError || !matches || matches.length === 0) {
    return [];
  }

  // 收集对方用户ID和活动ID
  const partnerIds = new Set<string>();
  const eventIds = new Set<string>();
  matches.forEach((m: Match) => {
    partnerIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
    eventIds.add(m.event_id);
  });

  // 并行获取 profiles 和 events
  const [profilesRes, eventsRes] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', Array.from(partnerIds)),
    supabase.from('evt_events').select('event_id, name').in('event_id', Array.from(eventIds)),
  ]);

  const profileMap = new Map<string, Profile>(
    profilesRes.data?.map((p: Profile) => [p.user_id, p]) || []
  );
  const eventMap = new Map<string, string>(
    eventsRes.data?.map((e: { event_id: string; name: string }) => [e.event_id, e.name]) || []
  );

  // 去重：同一个人只保留最近一次配对
  const seen = new Set<string>();
  const connections: Connection[] = [];

  for (const m of matches as Match[]) {
    const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
    if (seen.has(partnerId)) continue;
    seen.add(partnerId);

    const profile = profileMap.get(partnerId);
    connections.push({
      user_id: partnerId,
      nickname: profile?.nickname ?? null,
      gender: profile?.gender ?? null,
      age_group: profile?.age_group ?? null,
      event_name: eventMap.get(m.event_id) ?? '',
      event_id: m.event_id,
      match_id: m.match_id,
      matched_at: m.created_at,
    });
  }

  return connections;
}
