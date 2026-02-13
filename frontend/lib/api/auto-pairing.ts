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
  reasons: string[];
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
 * Build a Set of history pair keys from existing matches.
 * Each pair is stored as both orderings: "u1:u2" and "u2:u1".
 */
async function fetchHistoryPairs(eventId: string): Promise<Set<string>> {
  const { data: existingMatches } = await supabase
    .from('match_records')
    .select('user1_id, user2_id')
    .eq('event_id', eventId);

  const historySet = new Set<string>();
  if (existingMatches) {
    for (const m of existingMatches) {
      historySet.add(`${m.user1_id}:${m.user2_id}`);
      historySet.add(`${m.user2_id}:${m.user1_id}`);
    }
  }
  return historySet;
}

/**
 * Generate optimal 1v1 pairs from a list of ready user IDs.
 * - Excludes pairs that have already been matched in this event.
 * - Users with profiles: matched by score (greedy maximum-weight matching).
 * - Users without profiles: randomly paired among themselves.
 */
export async function generatePairs(
  eventId: string,
  readyUserIds: string[]
): Promise<{ pairs: PairResult[]; unpairedUserId?: string }> {
  if (readyUserIds.length < 2) {
    return { pairs: [], unpairedUserId: readyUserIds[0] };
  }

  // 0. Fetch history pairs for this event
  const historySet = await fetchHistoryPairs(eventId);

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
        const id1 = profiledIds[i];
        const id2 = profiledIds[j];

        // Skip history pairs
        if (historySet.has(`${id1}:${id2}`)) continue;

        const u1 = usersWithProfile.get(id1)!;
        const u2 = usersWithProfile.get(id2)!;
        const result = calculateMatchScore(u1, u2);
        scoredPairs.push({
          user1Id: id1,
          user2Id: id2,
          score: result.score,
          reasons: result.reasons,
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
    const id1 = remaining[i];
    const id2 = remaining[i + 1];

    // Skip history pairs for random fallback
    if (historySet.has(`${id1}:${id2}`)) {
      // Try to find a non-history partner further in the array
      let swapped = false;
      for (let k = i + 2; k < remaining.length; k++) {
        if (!paired.has(remaining[k]) && !historySet.has(`${id1}:${remaining[k]}`)) {
          [remaining[i + 1], remaining[k]] = [remaining[k], remaining[i + 1]];
          swapped = true;
          break;
        }
      }
      // If no swap found, pair them anyway (all options exhausted)
      if (!swapped) {
        finalPairs.push({
          user1Id: id1,
          user2Id: id2,
          score: 0,
          reasons: ['随机配对'],
        });
        paired.add(id1);
        paired.add(id2);
        continue;
      }
    }

    finalPairs.push({
      user1Id: remaining[i],
      user2Id: remaining[i + 1],
      score: 0,
      reasons: ['随机配对'],
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
  eventId: string,
  activeModuleId?: string
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
      p_active_module_id: activeModuleId ?? null,
    });

    if (!error && data) {
      const matchId = data as string;
      results.push({
        user1Id: pair.user1Id,
        user2Id: pair.user2Id,
        matchId,
      });

      // Update match_score and match_reasons on the persisted row
      await supabase
        .from('match_records')
        .update({
          match_score: pair.score,
          match_reasons: pair.reasons,
        })
        .eq('match_id', matchId);
    } else {
      errors.push(error?.message ?? 'Unknown error');
    }
  }

  if (results.length === 0 && errors.length > 0) {
    throw new Error(`保存配对失败: ${errors[0]}`);
  }

  return results;
}
