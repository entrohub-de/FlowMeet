import { supabase } from '@/lib/supabase/client';
import { getCurrentUserId } from './auth-utils';
import {
  calculateMatchScore,
  type UserWithPreferences,
} from './matching-algorithm';
import type { Profile, Preferences, Match } from '@/types/domain';

export interface Recommendation {
  userId: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
  score: number;
  reasons: string[];
  eventId: string;
  eventName: string;
}

export interface PendingRequest {
  matchId: string;
  eventId: string;
  eventName: string;
  partnerId: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
  direction: 'sent' | 'received';
  createdAt: string;
}

/**
 * Get recommended connections for a user from a specific event.
 * - Only considers checked-in users
 * - Excludes users already connected (accepted/completed matches)
 * - Excludes users with pending requests
 * - Returns top recommendations sorted by match score
 */
export async function getEventRecommendations(
  eventId: string,
  userId: string,
  limit = 10
): Promise<Recommendation[]> {
  // 1. Get all checked-in users for this event (excluding current user)
  const { data: signups } = await supabase
    .from('evt_signups')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .eq('checked_in', true);

  if (!signups || signups.length === 0) return [];

  const checkedInUserIds = signups
    .map((s) => s.user_id)
    .filter((id) => id !== userId);

  if (checkedInUserIds.length === 0) return [];

  // 2. Get existing matches to exclude (any status)
  const { data: existingMatches } = await supabase
    .from('match_records')
    .select('user1_id, user2_id')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  const excludeSet = new Set<string>();
  if (existingMatches) {
    for (const m of existingMatches) {
      excludeSet.add(m.user1_id === userId ? m.user2_id : m.user1_id);
    }
  }

  // Filter out already connected users
  const candidateIds = checkedInUserIds.filter((id) => !excludeSet.has(id));
  if (candidateIds.length === 0) return [];

  // 3. Fetch profiles & preferences for current user + candidates
  const allIds = [userId, ...candidateIds];
  const [profilesRes, prefsRes, eventRes] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', allIds),
    supabase.from('usr_preferences').select('*').in('user_id', allIds),
    supabase.from('evt_events').select('name').eq('event_id', eventId).single(),
  ]);

  const profileMap = new Map<string, Profile>(
    profilesRes.data?.map((p: Profile) => [p.user_id, p]) || []
  );
  const prefsMap = new Map<string, Preferences>(
    prefsRes.data?.map((p: Preferences) => [p.user_id, p]) || []
  );
  const eventName = eventRes.data?.name ?? '';

  const currentUserProfile = profileMap.get(userId);
  if (!currentUserProfile) return [];

  const currentUser: UserWithPreferences = {
    profile: currentUserProfile,
    preferences: prefsMap.get(userId) ?? null,
  };

  // 4. Score all candidates
  const scored: Recommendation[] = [];
  for (const candId of candidateIds) {
    const profile = profileMap.get(candId);
    if (!profile) continue;

    const candidate: UserWithPreferences = {
      profile,
      preferences: prefsMap.get(candId) ?? null,
    };

    const result = calculateMatchScore(currentUser, candidate);
    scored.push({
      userId: candId,
      nickname: profile.nickname,
      gender: profile.gender,
      age_group: profile.age_group,
      score: result.score,
      reasons: result.reasons,
      eventId,
      eventName,
    });
  }

  // Sort by score descending, return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Get recommendations from all recent events user attended.
 */
export async function getAllRecommendations(
  userId: string,
  maxPerEvent = 5
): Promise<Recommendation[]> {
  // Get user's recent events (checked in, passed/active)
  const { data: signups } = await supabase
    .from('evt_signups')
    .select('event_id, evt_events!inner(event_id, name, status, end_time)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('checked_in', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!signups || signups.length === 0) return [];

  const eventIds = signups.map((s) => s.event_id);

  // Get recommendations from each event in parallel
  const allRecs = await Promise.all(
    eventIds.map((eid) => getEventRecommendations(eid, userId, maxPerEvent))
  );

  // Flatten, dedupe by userId (keep highest score)
  const seen = new Map<string, Recommendation>();
  for (const recs of allRecs) {
    for (const rec of recs) {
      const existing = seen.get(rec.userId);
      if (!existing || rec.score > existing.score) {
        seen.set(rec.userId, rec);
      }
    }
  }

  const result = Array.from(seen.values());
  result.sort((a, b) => b.score - a.score);
  return result;
}

/**
 * Send a connection request (creates a pending match record).
 */
export async function sendConnectionRequest(
  eventId: string,
  targetUserId: string
): Promise<{ matchId: string } | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  // Check if match already exists
  const { data: existing } = await supabase
    .from('match_records')
    .select('match_id')
    .eq('event_id', eventId)
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`
    )
    .maybeSingle();

  if (existing) return { matchId: existing.match_id };

  // Create new pending match
  const { data, error } = await supabase
    .from('match_records')
    .insert({
      event_id: eventId,
      user1_id: userId,
      user2_id: targetUserId,
      status: 'pending',
      active_module_id: null,
    })
    .select('match_id')
    .single();

  if (error) {
    console.error('Failed to send connection request:', error);
    return null;
  }

  return { matchId: data.match_id };
}

/**
 * Get pending connection requests for the current user.
 */
export async function getPendingRequests(
  userId: string
): Promise<PendingRequest[]> {
  // Fetch pending matches involving this user
  // Live matches always use status='accepted', so pending = connection requests
  const { data: matches } = await supabase
    .from('match_records')
    .select('*')
    .eq('status', 'pending')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (!matches || matches.length === 0) return [];

  // Collect partner IDs and event IDs
  const partnerIds = new Set<string>();
  const eventIds = new Set<string>();
  for (const m of matches as Match[]) {
    partnerIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
    eventIds.add(m.event_id);
  }

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

  return (matches as Match[]).map((m) => {
    const partnerId = m.user1_id === userId ? m.user2_id : m.user1_id;
    const profile = profileMap.get(partnerId);
    return {
      matchId: m.match_id,
      eventId: m.event_id,
      eventName: eventMap.get(m.event_id) ?? '',
      partnerId,
      nickname: profile?.nickname ?? null,
      gender: profile?.gender ?? null,
      age_group: profile?.age_group ?? null,
      direction: m.user1_id === userId ? 'sent' : 'received',
      createdAt: m.created_at,
    };
  });
}

/**
 * Respond to a connection request (accept or decline).
 */
export async function respondToConnectionRequest(
  matchId: string,
  accept: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('match_records')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('match_id', matchId);

  if (error) {
    console.error('Failed to respond to connection request:', error);
    return false;
  }
  return true;
}
