import { supabase } from '@/lib/supabase/client';
import {
  calculateMatchScore,
  type UserWithPreferences,
} from './matching-algorithm';
import type { Profile, Preferences } from '@/types/domain';

export interface GroupResult {
  memberIds: string[];
  avgScore: number;
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
 * Calculate average pairwise score for a group of users.
 */
function calculateGroupAvgScore(members: UserWithPreferences[]): number {
  if (members.length < 2) return 0;
  let totalScore = 0;
  let pairCount = 0;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      totalScore += calculateMatchScore(members[i], members[j]).score;
      pairCount++;
    }
  }
  return pairCount > 0 ? totalScore / pairCount : 0;
}

/**
 * Build a Set of history pair keys from existing matches and group memberships.
 */
async function fetchHistoryPairs(eventId: string): Promise<Set<string>> {
  const { data: existingMatches } = await supabase
    .from('evt_matches')
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
 * Count how many history pair overlaps a candidate has with existing group members.
 */
function countHistoryOverlaps(
  candidateId: string,
  groupMembers: string[],
  historySet: Set<string>
): number {
  let count = 0;
  for (const memberId of groupMembers) {
    if (historySet.has(`${candidateId}:${memberId}`)) {
      count++;
    }
  }
  return count;
}

/**
 * Generate optimal groups from a list of ready user IDs.
 * Uses greedy optimization: form groups by picking users that maximize diversity
 * while minimizing history pair overlaps.
 */
export async function generateGroups(
  eventId: string,
  readyUserIds: string[],
  groupSize: number
): Promise<{ groups: GroupResult[]; ungroupedUserIds: string[] }> {
  if (readyUserIds.length < 2) {
    return { groups: [], ungroupedUserIds: [...readyUserIds] };
  }

  const effectiveGroupSize = Math.max(2, Math.min(groupSize, readyUserIds.length));

  // Fetch history pairs
  const historySet = await fetchHistoryPairs(eventId);

  // Fetch profiles + preferences
  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', readyUserIds);

  const { data: preferences } = await supabase
    .from('usr_preferences')
    .select('*')
    .in('user_id', readyUserIds);

  // Build user data map
  const userMap = new Map<string, UserWithPreferences>();
  for (const uid of readyUserIds) {
    const profile = profiles?.find((p) => p.user_id === uid);
    userMap.set(uid, {
      profile: (profile as Profile) ?? { user_id: uid, nickname: null, gender: null, age_group: null } as unknown as Profile,
      preferences: (preferences?.find((p) => p.user_id === uid) as Preferences) ?? null,
    });
  }

  // Build pairwise score matrix for profiled users
  const scoreMatrix = new Map<string, number>();
  const ids = [...readyUserIds];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const u1 = userMap.get(ids[i])!;
      const u2 = userMap.get(ids[j])!;
      const score = calculateMatchScore(u1, u2).score;
      scoreMatrix.set(`${ids[i]}:${ids[j]}`, score);
      scoreMatrix.set(`${ids[j]}:${ids[i]}`, score);
    }
  }

  // Greedy group assignment
  const remaining = shuffle([...readyUserIds]);
  const groups: GroupResult[] = [];
  const assigned = new Set<string>();

  while (remaining.filter((id) => !assigned.has(id)).length >= effectiveGroupSize) {
    const available = remaining.filter((id) => !assigned.has(id));
    const group: string[] = [available[0]];
    assigned.add(available[0]);

    // Greedily add users that maximize group diversity and minimize history overlaps
    while (group.length < effectiveGroupSize) {
      let bestUser = '';
      let bestScore = -Infinity;

      for (const candidate of available) {
        if (assigned.has(candidate)) continue;

        // Calculate average score with current group members
        let totalScore = 0;
        for (const member of group) {
          totalScore += scoreMatrix.get(`${candidate}:${member}`) ?? 0;
        }
        const avgScore = totalScore / group.length;

        // Penalize candidates who have history with group members
        const historyOverlaps = countHistoryOverlaps(candidate, group, historySet);
        const penalizedScore = avgScore - historyOverlaps * 20;

        if (penalizedScore > bestScore) {
          bestScore = penalizedScore;
          bestUser = candidate;
        }
      }

      if (bestUser) {
        group.push(bestUser);
        assigned.add(bestUser);
      } else {
        break;
      }
    }

    const members = group.map((id) => userMap.get(id)!);
    groups.push({
      memberIds: group,
      avgScore: calculateGroupAvgScore(members),
    });
  }

  // Handle remaining users: add them to existing groups or form a smaller group
  const ungrouped = remaining.filter((id) => !assigned.has(id));
  if (ungrouped.length > 0 && groups.length > 0) {
    // Distribute remaining users to existing groups
    for (let i = 0; i < ungrouped.length; i++) {
      groups[i % groups.length].memberIds.push(ungrouped[i]);
    }
    return { groups, ungroupedUserIds: [] };
  }

  return { groups, ungroupedUserIds: ungrouped };
}

/**
 * Persist groups to database via RPC.
 */
export async function persistGroups(
  groups: GroupResult[],
  eventId: string,
  stepId: string
): Promise<Array<{ groupId: string; memberIds: string[] }>> {
  const results: Array<{ groupId: string; memberIds: string[] }> = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];

    // Create group via RPC
    const { data: groupId, error: groupError } = await supabase.rpc('host_upsert_group', {
      p_event_id: eventId,
      p_name: `Group ${i + 1}`,
      p_max_size: group.memberIds.length,
      p_step_id: stepId,
    });

    if (groupError || !groupId) {
      console.error('Error creating group:', groupError);
      continue;
    }

    // Add members via RPC
    const { error: memberError } = await supabase.rpc('host_add_group_members', {
      p_group_id: groupId,
      p_user_ids: group.memberIds,
    });

    if (memberError) {
      console.error('Error adding group members:', memberError);
    }

    results.push({ groupId: groupId as string, memberIds: group.memberIds });
  }

  return results;
}
