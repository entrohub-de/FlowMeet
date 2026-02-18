import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError } from '@/lib/api-helpers';
import { calculateMatchScore, type UserWithPreferences } from '@/lib/api/matching-algorithm';
import type { Profile, Preferences } from '@/types/domain';

interface GroupResult {
  memberIds: string[];
  avgScore: number;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

/** POST /api/v1/events/:eventId/matching/groups — generate and persist groups */
export const POST = withApiHandler(async (request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const body = await request.json();
  const readyUserIds: string[] = body.readyUserIds;
  const groupSize: number = body.groupSize ?? 4;
  const stepId: string | undefined = body.stepId;

  if (!Array.isArray(readyUserIds) || readyUserIds.length < 2) {
    return apiError('readyUserIds must be an array with at least 2 user IDs', 'VALIDATION_ERROR');
  }
  if (!stepId) {
    return apiError('stepId is required for group persistence', 'VALIDATION_ERROR');
  }

  const supabase = createServerClient();
  const effectiveGroupSize = Math.max(2, Math.min(groupSize, readyUserIds.length));

  // Fetch history pairs
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

  // Fetch profiles + preferences
  const [{ data: profiles }, { data: preferences }] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', readyUserIds),
    supabase.from('usr_preferences').select('*').in('user_id', readyUserIds),
  ]);

  const userMap = new Map<string, UserWithPreferences>();
  for (const uid of readyUserIds) {
    const profile = profiles?.find((p) => p.user_id === uid);
    userMap.set(uid, {
      profile: (profile as Profile) ?? ({ user_id: uid, nickname: null, gender: null, age_group: null } as unknown as Profile),
      preferences: (preferences?.find((p) => p.user_id === uid) as Preferences) ?? null,
    });
  }

  // Build score matrix
  const scoreMatrix = new Map<string, number>();
  const ids = [...readyUserIds];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const score = calculateMatchScore(userMap.get(ids[i])!, userMap.get(ids[j])!).score;
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

    while (group.length < effectiveGroupSize) {
      let bestUser = '';
      let bestScore = -Infinity;

      for (const candidate of available) {
        if (assigned.has(candidate)) continue;
        let totalScore = 0;
        for (const member of group) {
          totalScore += scoreMatrix.get(`${candidate}:${member}`) ?? 0;
        }
        const avgScore = totalScore / group.length;

        let historyOverlaps = 0;
        for (const member of group) {
          if (historySet.has(`${candidate}:${member}`)) historyOverlaps++;
        }
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
    groups.push({ memberIds: group, avgScore: calculateGroupAvgScore(members) });
  }

  // Distribute remaining users
  const ungrouped = remaining.filter((id) => !assigned.has(id));
  if (ungrouped.length > 0 && groups.length > 0) {
    for (let i = 0; i < ungrouped.length; i++) {
      groups[i % groups.length].memberIds.push(ungrouped[i]);
    }
  }

  // Persist groups via RPC
  const persisted: Array<{ groupId: string; memberIds: string[] }> = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const { data: groupId, error: groupError } = await supabase.rpc('host_upsert_group', {
      p_event_id: eventId,
      p_name: `Group ${i + 1}`,
      p_max_size: group.memberIds.length,
      p_step_id: stepId,
    });

    if (groupError || !groupId) continue;

    const { error: memberError } = await supabase.rpc('host_add_group_members', {
      p_group_id: groupId,
      p_user_ids: group.memberIds,
    });

    if (!memberError) {
      persisted.push({ groupId: groupId as string, memberIds: group.memberIds });
    }
  }

  return apiSuccess({
    groups,
    persisted,
    ungroupedUserIds: ungrouped.length > 0 && groups.length === 0 ? ungrouped : [],
  }, 201);
});
