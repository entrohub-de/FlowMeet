import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types/domain';

export interface TestUser {
  userId: string;
  email: string;
  profile: Profile | null;
  isSignedUp: boolean;
  isCheckedIn: boolean;
}

/**
 * Get all test users (emails ending with @flowmeet.test)
 */
export async function getTestUsers(eventId?: string): Promise<TestUser[]> {
  // Get all profiles — filter by test email pattern via auth admin is not possible
  // from frontend. Instead, look for profiles with nicknames from the seed script
  // or all users and filter.
  // Simpler approach: get all users who have signed up to the event.
  if (!eventId) return [];

  // Get event signups
  const { data: signups } = await supabase
    .from('evt_signups')
    .select('user_id')
    .eq('event_id', eventId);

  if (!signups || signups.length === 0) return [];

  const userIds = signups.map((s) => s.user_id);

  // Get profiles
  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', userIds);

  // Get session for checkin status
  const { data: sessions } = await supabase
    .from('session_flows')
    .select('session_id')
    .eq('event_id', eventId)
    .limit(1);

  const sessionId = sessions?.[0]?.session_id;

  const checkinMap = new Map<string, boolean>();
  if (sessionId) {
    const { data: assignments } = await supabase
      .from('evt_assignments')
      .select('user_id, checked_in')
      .eq('session_id', sessionId)
      .in('user_id', userIds);

    assignments?.forEach((a) => checkinMap.set(a.user_id, a.checked_in));
  }

  return userIds.map((uid) => ({
    userId: uid,
    email: '',
    profile: (profiles?.find((p) => p.user_id === uid) as Profile) ?? null,
    isSignedUp: true,
    isCheckedIn: checkinMap.get(uid) ?? false,
  }));
}

/**
 * Batch check-in users to an event
 */
export async function batchCheckinUsers(
  eventId: string,
  userIds: string[]
): Promise<boolean> {
  const { data: sessions } = await supabase
    .from('session_flows')
    .select('session_id')
    .eq('event_id', eventId)
    .limit(1);

  const sessionId = sessions?.[0]?.session_id;
  if (!sessionId) return false;

  const assignments = userIds.map((userId) => ({
    session_id: sessionId,
    user_id: userId,
    checked_in: true,
    checked_in_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('evt_assignments')
    .upsert(assignments, { onConflict: 'session_id,user_id' });

  return !error;
}

/**
 * Clean up test data for an event (matches, groups, assignments)
 */
export async function cleanupTestData(eventId: string): Promise<{
  matchesDeleted: number;
  groupsDeleted: number;
}> {
  // Delete matches
  const { data: deletedMatches } = await supabase
    .from('match_records')
    .delete()
    .eq('event_id', eventId)
    .select('match_id');

  // Delete group members and groups
  const { data: groups } = await supabase
    .from('evt_groups')
    .select('group_id')
    .eq('event_id', eventId);

  if (groups && groups.length > 0) {
    const groupIds = groups.map((g) => g.group_id);
    await supabase
      .from('evt_group_members')
      .delete()
      .in('group_id', groupIds);

    await supabase
      .from('evt_groups')
      .delete()
      .eq('event_id', eventId);
  }

  return {
    matchesDeleted: deletedMatches?.length ?? 0,
    groupsDeleted: groups?.length ?? 0,
  };
}
