'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  observeMatchingQueue,
  broadcastMatchAssignments,
  getStaleUserIds,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { generatePairs, persistPairs, type PairResult } from '@/lib/api/auto-pairing';
import { logHostAction } from '@/lib/api/host-actions';
import { createActiveModule, completeActiveModule } from '@/lib/api/active-module';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface StepMatchingState {
  readyCount: number;
  totalPresent: number;
  pairedCount: number;
  readyUserIds: string[];
  staleUserIds: string[];
}

export interface MatchQualityInfo {
  totalPairs: number;
  avgScore: number;
  pairs: PairResult[];
  historyExcluded: boolean;
}

export function useHostFlowMatching(
  eventId: string,
  activeStepId: string | null,
  activeStepPairingMode?: 'group' | '1v1'
) {
  const [matchingState, setMatchingState] = useState<StepMatchingState>({
    readyCount: 0,
    totalPresent: 0,
    pairedCount: 0,
    readyUserIds: [],
    staleUserIds: [],
  });
  const [isMatching, setIsMatching] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [matchQuality, setMatchQuality] = useState<MatchQualityInfo | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe to matching presence for the active 1v1 step
  useEffect(() => {
    if (activeStepPairingMode !== '1v1' || !activeStepId || !eventId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setMatchingState({ readyCount: 0, totalPresent: 0, pairedCount: 0, readyUserIds: [], staleUserIds: [] });
      return;
    }

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setMatchingState((prev) => ({
        ...prev,
        readyCount: readyUsers.length,
        totalPresent: allUsers.length,
        readyUserIds: readyUsers.map((u) => u.userId),
      }));
    };

    const channel = observeMatchingQueue(eventId, activeStepId, {
      onPresenceSync: handlePresenceSync,
    });
    channelRef.current = channel;

    // Periodic stale user detection (every 15s, threshold 30s)
    const staleCheckInterval = setInterval(() => {
      if (channelRef.current) {
        const stale = getStaleUserIds(channelRef.current, 30_000);
        setMatchingState((prev) => ({ ...prev, staleUserIds: stale }));
      }
    }, 15_000);

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      clearInterval(staleCheckInterval);
    };
  }, [eventId, activeStepId, activeStepPairingMode]);

  const triggerMatching = useCallback(async () => {
    if (!activeStepId || !eventId || isMatching) return;
    if (matchingState.readyUserIds.length < 2) return;

    setIsMatching(true);
    setMatchingError(null);
    logHostAction(eventId, 'matching_triggered', {
      readyCount: matchingState.readyUserIds.length,
      stepId: activeStepId,
    }, activeStepId ?? undefined);
    try {
      // 0. Create active module record for this matching round
      const { data: { session } } = await (await import('@/lib/supabase/client')).supabase.auth.getSession();
      const activeModule = await createActiveModule(
        eventId,
        activeStepId,
        activeStepPairingMode ?? '1v1',
        matchingState.readyUserIds.length,
        session?.user?.id ?? ''
      );

      // 1. Generate optimal pairs (with history exclusion)
      const { pairs, unpairedUserId } = await generatePairs(eventId, matchingState.readyUserIds);

      // 2. Persist to database (with active_module_id)
      const persisted = await persistPairs(pairs, eventId, activeModule.id);

      if (persisted.length === 0) {
        setMatchingError('配对保存失败，请检查数据库权限');
        return;
      }

      // 3. Store match quality info
      const avgScore = pairs.length > 0
        ? Math.round(pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length)
        : 0;
      setMatchQuality({
        totalPairs: pairs.length,
        avgScore,
        pairs,
        historyExcluded: true,
      });

      // 4. Complete the active module record with stats
      await completeActiveModule(activeModule.id, {
        paired_count: persisted.length * 2,
        unpaired_user_ids: unpairedUserId ? [unpairedUserId] : [],
        avg_match_score: avgScore,
      });

      // 5. Broadcast to all participants via the existing observer channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'match_assigned',
          payload: {
            pairs: persisted,
            unpaired: unpairedUserId ? [unpairedUserId] : undefined,
            timestamp: new Date().toISOString(),
          },
        });
      } else {
        broadcastMatchAssignments(eventId, activeStepId, {
          pairs: persisted,
          unpaired: unpairedUserId ? [unpairedUserId] : undefined,
          timestamp: new Date().toISOString(),
        });
      }

      setMatchingState((prev) => ({
        ...prev,
        pairedCount: persisted.length * 2,
      }));
    } catch (error) {
      console.error('Error triggering matching:', error);
      setMatchingError(
        error instanceof Error ? error.message : '匹配过程中发生错误'
      );
    } finally {
      setIsMatching(false);
    }
  }, [eventId, activeStepId, activeStepPairingMode, isMatching, matchingState.readyUserIds]);

  return { matchingState, triggerMatching, isMatching, matchingError, matchQuality };
}
