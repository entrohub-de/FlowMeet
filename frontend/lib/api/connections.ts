import { supabase } from '../supabase/client';
import { getCurrentUserId } from './auth-utils';
import type { Connection as ConnectionEntity, Profile } from '@/types/domain';

/**
 * 前端视图类型 — 保持向后兼容，用于列表展示
 */
export interface Connection {
  user_id: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
  avatar_url: string | null;
  event_name: string;
  event_id: string | null;
  connection_id: string;
  note: string | null;
  connected_at: string;
  status: 'pending' | 'accepted' | 'declined';
  direction: 'sent' | 'received' | null;
  interested: boolean;
  mutual_interest: boolean;
}

/**
 * 规范化用户对方向：确保 user1_id < user2_id
 */
function orderUserIds(idA: string, idB: string): { user1_id: string; user2_id: string } {
  return idA < idB
    ? { user1_id: idA, user2_id: idB }
    : { user1_id: idB, user2_id: idA };
}

/**
 * 获取当前用户的所有已接受连接
 */
export async function getUserConnections(userId: string): Promise<Connection[]> {
  const { data: rows, error } = await supabase
    .from('usr_connections')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('connected_at', { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const partnerIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const r of rows as ConnectionEntity[]) {
    partnerIds.add(r.user1_id === userId ? r.user2_id : r.user1_id);
    if (r.source_event_id) eventIds.add(r.source_event_id);
  }

  const [profilesRes, eventsRes] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', Array.from(partnerIds)),
    eventIds.size > 0
      ? supabase.from('evt_events').select('event_id, name').in('event_id', Array.from(eventIds))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, Profile>(
    profilesRes.data?.map((p: Profile) => [p.user_id, p]) || []
  );
  const eventMap = new Map<string, string>(
    eventsRes.data?.map((e: { event_id: string; name: string }) => [e.event_id, e.name]) || []
  );

  return (rows as ConnectionEntity[]).map((r) => {
    const partnerId = r.user1_id === userId ? r.user2_id : r.user1_id;
    const isUser1 = r.user1_id === userId;
    const profile = profileMap.get(partnerId);
    const myNote = isUser1 ? r.user1_note : r.user2_note;
    const myInterested = isUser1 ? r.user1_interested : r.user2_interested;
    return {
      user_id: partnerId,
      nickname: profile?.nickname ?? null,
      gender: profile?.gender ?? null,
      age_group: profile?.age_group ?? null,
      avatar_url: profile?.avatar_url ?? null,
      event_name: r.source_event_id ? (eventMap.get(r.source_event_id) ?? '') : '',
      event_id: r.source_event_id,
      connection_id: r.connection_id,
      note: myNote,
      connected_at: r.connected_at ?? r.created_at,
      status: r.status,
      direction: null,
      interested: myInterested,
      mutual_interest: r.user1_interested && r.user2_interested,
    };
  });
}

/**
 * 获取待处理的连接请求（发送和收到的）
 */
export async function getPendingConnections(userId: string): Promise<Connection[]> {
  const { data: rows, error } = await supabase
    .from('usr_connections')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const partnerIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const r of rows as ConnectionEntity[]) {
    partnerIds.add(r.user1_id === userId ? r.user2_id : r.user1_id);
    if (r.source_event_id) eventIds.add(r.source_event_id);
  }

  const [profilesRes, eventsRes] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', Array.from(partnerIds)),
    eventIds.size > 0
      ? supabase.from('evt_events').select('event_id, name').in('event_id', Array.from(eventIds))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, Profile>(
    profilesRes.data?.map((p: Profile) => [p.user_id, p]) || []
  );
  const eventMap = new Map<string, string>(
    eventsRes.data?.map((e: { event_id: string; name: string }) => [e.event_id, e.name]) || []
  );

  return (rows as ConnectionEntity[]).map((r) => {
    const partnerId = r.user1_id === userId ? r.user2_id : r.user1_id;
    const isUser1 = r.user1_id === userId;
    const profile = profileMap.get(partnerId);
    return {
      user_id: partnerId,
      nickname: profile?.nickname ?? null,
      gender: profile?.gender ?? null,
      age_group: profile?.age_group ?? null,
      avatar_url: profile?.avatar_url ?? null,
      event_name: r.source_event_id ? (eventMap.get(r.source_event_id) ?? '') : '',
      event_id: r.source_event_id,
      connection_id: r.connection_id,
      note: null,
      connected_at: r.created_at,
      status: r.status,
      direction: r.requested_by === userId ? 'sent' : 'received',
      interested: isUser1 ? r.user1_interested : r.user2_interested,
      mutual_interest: r.user1_interested && r.user2_interested,
    };
  });
}

/**
 * 发送连接请求
 */
export async function createConnectionRequest(
  targetUserId: string,
  sourceEventId?: string,
  sourceMatchId?: string
): Promise<{ connectionId: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { user1_id, user2_id } = orderUserIds(userId, targetUserId);

  // 检查是否已存在
  const { data: existing } = await supabase
    .from('usr_connections')
    .select('connection_id, status')
    .eq('user1_id', user1_id)
    .eq('user2_id', user2_id)
    .maybeSingle();

  if (existing) {
    return { connectionId: existing.connection_id };
  }

  const { data, error } = await supabase
    .from('usr_connections')
    .insert({
      user1_id,
      user2_id,
      source_event_id: sourceEventId ?? null,
      source_match_id: sourceMatchId ?? null,
      status: 'pending',
      requested_by: userId,
    })
    .select('connection_id')
    .single();

  if (error) {
    console.error('Failed to create connection request:', error);
    return null;
  }

  return { connectionId: data.connection_id };
}

/**
 * 响应连接请求（接受/拒绝）
 */
export async function respondToConnection(
  connectionId: string,
  accept: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('usr_connections')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('connection_id', connectionId);

  if (error) {
    console.error('Failed to respond to connection:', error);
    return false;
  }
  return true;
}

/**
 * 更新连接备注（当前用户对某个连接的备注）
 */
export async function updateConnectionNote(
  connectionId: string,
  note: string
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  // 先获取连接确定当前用户是 user1 还是 user2
  const { data: conn } = await supabase
    .from('usr_connections')
    .select('user1_id, user2_id')
    .eq('connection_id', connectionId)
    .single();

  if (!conn) return false;

  const noteField = conn.user1_id === userId ? 'user1_note' : 'user2_note';
  const { error } = await supabase
    .from('usr_connections')
    .update({ [noteField]: note })
    .eq('connection_id', connectionId);

  if (error) {
    console.error('Failed to update connection note:', error);
    return false;
  }
  return true;
}

/**
 * 获取某个活动产生的连接
 */
export async function getConnectionsByEvent(
  userId: string,
  eventId: string
): Promise<Connection[]> {
  const { data: rows, error } = await supabase
    .from('usr_connections')
    .select('*')
    .eq('source_event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('connected_at', { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const partnerIds = (rows as ConnectionEntity[]).map((r) =>
    r.user1_id === userId ? r.user2_id : r.user1_id
  );

  const [profilesRes, eventRes] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', partnerIds),
    supabase.from('evt_events').select('event_id, name').eq('event_id', eventId).single(),
  ]);

  const profileMap = new Map<string, Profile>(
    profilesRes.data?.map((p: Profile) => [p.user_id, p]) || []
  );
  const eventName = eventRes.data?.name ?? '';

  return (rows as ConnectionEntity[]).map((r) => {
    const partnerId = r.user1_id === userId ? r.user2_id : r.user1_id;
    const isUser1 = r.user1_id === userId;
    const profile = profileMap.get(partnerId);
    const myNote = isUser1 ? r.user1_note : r.user2_note;
    return {
      user_id: partnerId,
      nickname: profile?.nickname ?? null,
      gender: profile?.gender ?? null,
      age_group: profile?.age_group ?? null,
      avatar_url: profile?.avatar_url ?? null,
      event_name: eventName,
      event_id: eventId,
      connection_id: r.connection_id,
      note: myNote,
      connected_at: r.connected_at ?? r.created_at,
      status: r.status,
      direction: null,
      interested: isUser1 ? r.user1_interested : r.user2_interested,
      mutual_interest: r.user1_interested && r.user2_interested,
    };
  });
}

/**
 * 获取连接总数统计
 */
export async function getConnectionStats(userId: string): Promise<{
  total: number;
  byEvent: { event_id: string; event_name: string; count: number }[];
}> {
  const { data: rows, error } = await supabase
    .from('usr_connections')
    .select('source_event_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (error || !rows) return { total: 0, byEvent: [] };

  const eventCounts = new Map<string, number>();
  for (const r of rows) {
    if (r.source_event_id) {
      eventCounts.set(r.source_event_id, (eventCounts.get(r.source_event_id) ?? 0) + 1);
    }
  }

  let byEvent: { event_id: string; event_name: string; count: number }[] = [];
  if (eventCounts.size > 0) {
    const { data: events } = await supabase
      .from('evt_events')
      .select('event_id, name')
      .in('event_id', Array.from(eventCounts.keys()));

    byEvent = (events ?? []).map((e: { event_id: string; name: string }) => ({
      event_id: e.event_id,
      event_name: e.name,
      count: eventCounts.get(e.event_id) ?? 0,
    }));
    byEvent.sort((a, b) => b.count - a.count);
  }

  return { total: rows.length, byEvent };
}

/**
 * 标记/取消对某个连接的"感兴趣"
 */
export async function toggleInterest(
  connectionId: string,
  interested: boolean
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { data: conn } = await supabase
    .from('usr_connections')
    .select('user1_id, user2_id')
    .eq('connection_id', connectionId)
    .single();

  if (!conn) return false;

  const field = conn.user1_id === userId ? 'user1_interested' : 'user2_interested';
  const { error } = await supabase
    .from('usr_connections')
    .update({ [field]: interested })
    .eq('connection_id', connectionId);

  if (error) {
    console.error('Failed to toggle interest:', error);
    return false;
  }
  return true;
}

/**
 * 获取用户的历次活动遇见记录（1v1 匹配 + 小组讨论）
 */
export interface Encounter {
  userId: string;
  nickname: string | null;
  avatar_url: string | null;
  eventName: string;
  eventId: string;
  type: '1v1' | 'group';
  date: string;
}

export async function getEncounterHistory(userId: string): Promise<Encounter[]> {
  // 1. 1v1 matches
  const { data: matches } = await supabase
    .from('match_records')
    .select('match_id, event_id, user1_id, user2_id, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  // 2. Group co-members: find groups user belongs to, then find other members
  const { data: myMemberships } = await supabase
    .from('evt_group_members')
    .select('group_id')
    .eq('user_id', userId);

  const groupIds = myMemberships?.map((m) => m.group_id) ?? [];

  let groupCoMembers: Array<{ user_id: string; group_id: string }> = [];
  if (groupIds.length > 0) {
    const { data } = await supabase
      .from('evt_group_members')
      .select('user_id, group_id')
      .in('group_id', groupIds)
      .neq('user_id', userId);
    groupCoMembers = data ?? [];
  }

  // Collect all partner IDs and event IDs
  const partnerIds = new Set<string>();
  const eventIds = new Set<string>();
  const groupIdSet = new Set(groupIds);

  for (const m of matches ?? []) {
    const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
    partnerIds.add(partnerId);
    eventIds.add(m.event_id);
  }
  for (const gm of groupCoMembers) {
    partnerIds.add(gm.user_id);
  }

  // Get group → event mapping
  const groupEventMap = new Map<string, string>();
  if (groupIdSet.size > 0) {
    const { data: groups } = await supabase
      .from('evt_groups')
      .select('group_id, event_id')
      .in('group_id', Array.from(groupIdSet));
    for (const g of groups ?? []) {
      groupEventMap.set(g.group_id, g.event_id);
      eventIds.add(g.event_id);
    }
  }

  if (partnerIds.size === 0) return [];

  // Batch fetch profiles and events
  const [profilesRes, eventsRes] = await Promise.all([
    supabase.from('usr_profiles').select('user_id, nickname, avatar_url').in('user_id', Array.from(partnerIds)),
    eventIds.size > 0
      ? supabase.from('evt_events').select('event_id, name').in('event_id', Array.from(eventIds))
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(profilesRes.data?.map((p: { user_id: string; nickname: string | null; avatar_url: string | null }) => [p.user_id, p]) ?? []);
  const eventMap = new Map(eventsRes.data?.map((e: { event_id: string; name: string }) => [e.event_id, e.name]) ?? []);

  const encounters: Encounter[] = [];

  // Add 1v1 matches
  for (const m of matches ?? []) {
    const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
    const profile = profileMap.get(partnerId);
    encounters.push({
      userId: partnerId,
      nickname: profile?.nickname ?? null,
      avatar_url: profile?.avatar_url ?? null,
      eventName: eventMap.get(m.event_id) ?? '',
      eventId: m.event_id,
      type: '1v1',
      date: m.created_at,
    });
  }

  // Add group co-members (deduplicate by eventId+userId)
  const seen = new Set(encounters.map((e) => `${e.eventId}:${e.userId}`));
  for (const gm of groupCoMembers) {
    const eventId = groupEventMap.get(gm.group_id) ?? '';
    const key = `${eventId}:${gm.user_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const profile = profileMap.get(gm.user_id);
    encounters.push({
      userId: gm.user_id,
      nickname: profile?.nickname ?? null,
      avatar_url: profile?.avatar_url ?? null,
      eventName: eventMap.get(eventId) ?? '',
      eventId,
      type: 'group',
      date: '',
    });
  }

  // Sort: 1v1 with date first, then group
  encounters.sort((a, b) => {
    if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (a.date) return -1;
    return 1;
  });

  return encounters;
}
