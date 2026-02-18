import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError } from '@/lib/api-helpers';
import { calculateMatchScore, type UserWithPreferences } from '@/lib/api/matching-algorithm';
import type { Profile, Preferences, NetworkingIntent } from '@/types/domain';

interface PairResult {
  user1Id: string;
  user2Id: string;
  score: number;
  reasons: string[];
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** POST /api/v1/events/:eventId/matching/pairs — generate and persist 1v1 pairs */
export const POST = withApiHandler(async (request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const body = await request.json();
  const readyUserIds: string[] = body.readyUserIds;
  const activeModuleId: string | undefined = body.activeModuleId;

  if (!Array.isArray(readyUserIds) || readyUserIds.length < 2) {
    return apiError('readyUserIds must be an array with at least 2 user IDs', 'VALIDATION_ERROR');
  }

  const supabase = createServerClient();

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

  // Fetch profiles + preferences + networking intent
  const [{ data: profiles }, { data: preferences }, { data: matchPreferences }] = await Promise.all([
    supabase.from('usr_profiles').select('*').in('user_id', readyUserIds),
    supabase.from('usr_preferences').select('*').in('user_id', readyUserIds),
    supabase.from('match_preferences').select('user_id, networking_intent').eq('event_id', eventId).in('user_id', readyUserIds),
  ]);

  const intentMap = new Map<string, NetworkingIntent | null>();
  if (matchPreferences) {
    for (const mp of matchPreferences) {
      intentMap.set(mp.user_id, (mp.networking_intent as NetworkingIntent) ?? null);
    }
  }

  // Split users: with profile vs without
  const usersWithProfile = new Map<string, UserWithPreferences>();
  const usersWithoutProfile: string[] = [];

  for (const uid of readyUserIds) {
    const profile = profiles?.find((p) => p.user_id === uid);
    if (profile) {
      usersWithProfile.set(uid, {
        profile: profile as Profile,
        preferences: (preferences?.find((p) => p.user_id === uid) as Preferences) ?? null,
        networkingIntent: intentMap.get(uid) ?? null,
      });
    } else {
      usersWithoutProfile.push(uid);
    }
  }

  const paired = new Set<string>();
  const finalPairs: PairResult[] = [];

  // Score-based matching for profiled users
  if (usersWithProfile.size >= 2) {
    const scoredPairs: PairResult[] = [];
    const profiledIds = Array.from(usersWithProfile.keys());

    for (let i = 0; i < profiledIds.length; i++) {
      for (let j = i + 1; j < profiledIds.length; j++) {
        const id1 = profiledIds[i];
        const id2 = profiledIds[j];
        if (historySet.has(`${id1}:${id2}`)) continue;

        const u1 = usersWithProfile.get(id1)!;
        const u2 = usersWithProfile.get(id2)!;
        const result = calculateMatchScore(u1, u2);
        scoredPairs.push({ user1Id: id1, user2Id: id2, score: result.score, reasons: result.reasons });
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

  // Random pairing for remaining users
  const remaining = readyUserIds.filter((id) => !paired.has(id));
  shuffle(remaining);

  for (let i = 0; i + 1 < remaining.length; i += 2) {
    finalPairs.push({
      user1Id: remaining[i],
      user2Id: remaining[i + 1],
      score: 0,
      reasons: ['随机配对'],
    });
    paired.add(remaining[i]);
    paired.add(remaining[i + 1]);
  }

  const unpairedUserId = readyUserIds.find((id) => !paired.has(id));

  // Persist pairs via RPC
  const persisted: Array<{ user1Id: string; user2Id: string; matchId: string }> = [];
  for (const pair of finalPairs) {
    const { data, error } = await supabase.rpc('host_upsert_match', {
      p_event_id: eventId,
      p_user1_id: pair.user1Id,
      p_user2_id: pair.user2Id,
      p_status: 'accepted',
      p_active_module_id: activeModuleId ?? null,
    });

    if (!error && data) {
      const matchId = data as string;
      persisted.push({ user1Id: pair.user1Id, user2Id: pair.user2Id, matchId });

      await supabase
        .from('match_records')
        .update({ match_score: pair.score, match_reasons: pair.reasons })
        .eq('match_id', matchId);
    }
  }

  return apiSuccess({
    pairs: finalPairs,
    persisted,
    unpairedUserId: unpairedUserId ?? null,
  }, 201);
});
