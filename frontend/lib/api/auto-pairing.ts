import { supabase } from '@/lib/supabase/client';
import {
  calculateMatchScore,
  type UserWithPreferences,
} from './matching-algorithm';
import type { Profile, Preferences } from '@/types/domain';

export interface PairResult {
  user1Id: string;
  user2Id: string;
  score: number;
}

/**
 * Shuffle array in-place (Fisher-Yates).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate optimal 1v1 pairs from a list of ready user IDs.
 * - Users with profiles: matched by score (greedy maximum-weight matching).
 * - Users without profiles: randomly paired among themselves.
 */
export async function generatePairs(
  readyUserIds: string[]
): Promise<{ pairs: PairResult[]; unpairedUserId?: string }> {
  if (readyUserIds.length < 2) {
    return { pairs: [], unpairedUserId: readyUserIds[0] };
  }

  // 1. Fetch profiles + preferences
  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', readyUserIds);

  const { data: preferences } = await supabase
    .from('usr_preferences')
    .select('*')
    .in('user_id', readyUserIds);

  // Split users: those with profiles vs those without
  const usersWithProfile = new Map<string, UserWithPreferences>();
  const usersWithoutProfile: string[] = [];

  for (const uid of readyUserIds) {
    const profile = profiles?.find((p) => p.user_id === uid);
    if (profile) {
      usersWithProfile.set(uid, {
        profile: profile as Profile,
        preferences: (preferences?.find((p) => p.user_id === uid) as Preferences) ?? null,
      });
    } else {
      usersWithoutProfile.push(uid);
    }
  }

  const paired = new Set<string>();
  const finalPairs: PairResult[] = [];

  // 2. Score-based matching for users with profiles
  if (usersWithProfile.size >= 2) {
    const scoredPairs: PairResult[] = [];
    const profiledIds = Array.from(usersWithProfile.keys());

    for (let i = 0; i < profiledIds.length; i++) {
      for (let j = i + 1; j < profiledIds.length; j++) {
        const u1 = usersWithProfile.get(profiledIds[i])!;
        const u2 = usersWithProfile.get(profiledIds[j])!;
        const result = calculateMatchScore(u1, u2);
        scoredPairs.push({
          user1Id: profiledIds[i],
          user2Id: profiledIds[j],
          score: result.score,
        });
      }
    }

    scoredPairs.sort((a, b) => b.score - a.score);

    for (const pair of scoredPairs) {
      if (!paired.has(pair.user1Id) && !paired.has(pair.user2Id)) {
        finalPairs.push(pair);
        paired.add(pair.user1Id);
        paired.add(pair.user2Id);
      }
    }
  }

  // 3. Collect all remaining unpaired users (no-profile + leftover profiled)
  const remaining = readyUserIds.filter((id) => !paired.has(id));
  shuffle(remaining);

  for (let i = 0; i + 1 < remaining.length; i += 2) {
    finalPairs.push({
      user1Id: remaining[i],
      user2Id: remaining[i + 1],
      score: 0,
    });
    paired.add(remaining[i]);
    paired.add(remaining[i + 1]);
  }

  // 4. Identify unpaired user (odd total count)
  const unpairedUserId = readyUserIds.find((id) => !paired.has(id));

  return { pairs: finalPairs, unpairedUserId };
}

/**
 * Persist pairs as accepted matches via SECURITY DEFINER RPC
 * (bypasses RLS; the function verifies host/admin role internally).
 */
export async function persistPairs(
  pairs: PairResult[],
  eventId: string
): Promise<Array<{ user1Id: string; user2Id: string; matchId: string }>> {
  if (pairs.length === 0) return [];

  const results: Array<{ user1Id: string; user2Id: string; matchId: string }> = [];
  const errors: string[] = [];

  for (const pair of pairs) {
    const { data, error } = await supabase.rpc('host_upsert_match', {
      p_event_id: eventId,
      p_user1_id: pair.user1Id,
      p_user2_id: pair.user2Id,
      p_status: 'accepted',
    });

    if (!error && data) {
      results.push({
        user1Id: pair.user1Id,
        user2Id: pair.user2Id,
        matchId: data as string,
      });
    } else {
      errors.push(error?.message ?? 'Unknown error');
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(`保存配对失败: ${errors[0]}`);
  }

  return results;
}
