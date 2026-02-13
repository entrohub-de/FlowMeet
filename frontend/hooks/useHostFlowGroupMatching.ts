'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  observeMatchingQueue,
  broadcastGroupAssignments,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { generateGroups, persistGroups } from '@/lib/api/auto-grouping';
import { logHostAction } from '@/lib/api/host-actions';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useHostFlowGroupMatching(
  eventId: string,
  activeStepId: string | null,
  activeStepPairingMode?: 'group' | '1v1'
) {
  const [readyCount, setReadyCount] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [readyUserIds, setReadyUserIds] = useState<string[]>([]);
  const [groupedCount, setGroupedCount] = useState(0);
  const [isGrouping, setIsGrouping] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (activeStepPairingMode !== 'group' || !activeStepId || !eventId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setReadyCount(0);
      setTotalPresent(0);
      setReadyUserIds([]);
      setGroupedCount(0);
      return;
    }

    if (channelRef.current) return;

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setReadyCount(readyUsers.length);
      setTotalPresent(allUsers.length);
      setReadyUserIds(readyUsers.map((u) => u.userId));
    };

    const channel = observeMatchingQueue(eventId, activeStepId, {
      onPresenceSync: handlePresenceSync,
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [activeStepPairingMode, activeStepId, eventId]);

  const triggerGrouping = useCallback(
    async (groupSize: number = 4) => {
      if (!activeStepId || readyUserIds.length < 2) return;
      setIsGrouping(true);
      logHostAction(eventId, 'grouping_triggered', {
        readyCount: readyUserIds.length,
        groupSize,
        stepId: activeStepId,
      }, activeStepId);

      try {
        const { groups } = await generateGroups(eventId, readyUserIds, groupSize);
        if (groups.length === 0) return;

        const persisted = await persistGroups(groups, eventId, activeStepId);

        const totalGrouped = persisted.reduce((acc, g) => acc + g.memberIds.length, 0);
        setGroupedCount(totalGrouped);

        broadcastGroupAssignments(eventId, activeStepId, {
          groups: persisted,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsGrouping(false);
      }
    },
    [activeStepId, readyUserIds, eventId]
  );

  return {
    readyCount,
    totalPresent,
    readyUserIds,
    groupedCount,
    isGrouping,
    triggerGrouping,
  };
}
