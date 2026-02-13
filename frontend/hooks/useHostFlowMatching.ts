'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  observeMatchingQueue,
  broadcastMatchAssignments,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { generatePairs, persistPairs } from '@/lib/api/auto-pairing';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface StepMatchingState {
  readyCount: number;
  totalPresent: number;
  pairedCount: number;
  readyUserIds: string[];
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
  });
  const [isMatching, setIsMatching] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe to matching presence for the active 1v1 step
  useEffect(() => {
    if (activeStepPairingMode !== '1v1' || !activeStepId || !eventId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setMatchingState({ readyCount: 0, totalPresent: 0, pairedCount: 0, readyUserIds: [] });
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

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [eventId, activeStepId, activeStepPairingMode]);

  const triggerMatching = useCallback(async () => {
    if (!activeStepId || !eventId || isMatching) return;
    if (matchingState.readyUserIds.length < 2) return;

    setIsMatching(true);
    setMatchingError(null);
    try {
      // 1. Generate optimal pairs
      const { pairs, unpairedUserId } = await generatePairs(matchingState.readyUserIds);

      // 2. Persist to database
      const persisted = await persistPairs(pairs, eventId);

      if (persisted.length === 0) {
        setMatchingError('配对保存失败，请检查数据库权限');
        return;
      }

      // 3. Broadcast to all participants via the existing observer channel
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
  }, [eventId, activeStepId, isMatching, matchingState.readyUserIds]);

  return { matchingState, triggerMatching, isMatching, matchingError };
}
