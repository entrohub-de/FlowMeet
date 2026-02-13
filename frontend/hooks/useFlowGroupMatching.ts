'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  joinMatchingQueue,
  setReady as setReadyInQueue,
  type GroupAssignmentPayload,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import type { Profile } from '@/types/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type FlowGroupMatchingPhase = 'idle' | 'ready_prompt' | 'waiting' | 'grouped';

export interface GroupMemberInfo {
  userId: string;
  profile: Profile | null;
}

export interface GroupInfo {
  groupId: string;
  members: GroupMemberInfo[];
}

export interface FlowGroupMatchingState {
  phase: FlowGroupMatchingPhase;
  readyCount: number;
  totalPresent: number;
  isReady: boolean;
  group: GroupInfo | null;
  isUngrouped: boolean;
}

export function useFlowGroupMatching(
  eventId: string,
  stepId: string,
  stepStatus: string,
  pairingMode?: 'group' | '1v1'
) {
  const [phase, setPhase] = useState<FlowGroupMatchingPhase>('idle');
  const [readyCount, setReadyCount] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [isUngrouped, setIsUngrouped] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const groupedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (pairingMode !== 'group' || stepStatus !== 'active' || !userId || !eventId || !stepId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (pairingMode !== 'group') {
        setPhase('idle');
        groupedRef.current = false;
      }
      return;
    }

    if (groupedRef.current || channelRef.current) return;

    setPhase('ready_prompt');

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setReadyCount(readyUsers.length);
      setTotalPresent(allUsers.length);
    };

    const handleGroupAssigned = async (payload: GroupAssignmentPayload) => {
      const myGroup = payload.groups.find((g) => g.memberIds.includes(userId));

      if (myGroup) {
        // Fetch profiles for all group members
        const otherMemberIds = myGroup.memberIds.filter((id) => id !== userId);
        const allMemberIds = [userId, ...otherMemberIds];

        const { data: profiles } = await supabase
          .from('usr_profiles')
          .select('*')
          .in('user_id', allMemberIds);

        const members: GroupMemberInfo[] = allMemberIds.map((id) => ({
          userId: id,
          profile: (profiles?.find((p) => p.user_id === id) as Profile) ?? null,
        }));

        setGroup({ groupId: myGroup.groupId, members });
        setIsUngrouped(false);
        setPhase('grouped');
        groupedRef.current = true;
      } else if (payload.ungrouped?.includes(userId)) {
        setIsUngrouped(true);
      }
    };

    const channel = joinMatchingQueue(eventId, stepId, userId, {
      onPresenceSync: handlePresenceSync,
      onGroupAssigned: handleGroupAssigned,
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairingMode, stepStatus, userId, eventId, stepId]);

  const toggleReady = useCallback(async () => {
    if (!channelRef.current || !userId) return;
    const newReady = !isReady;
    setIsReady(newReady);
    setPhase(newReady ? 'waiting' : 'ready_prompt');
    await setReadyInQueue(channelRef.current, userId, newReady);
  }, [isReady, userId]);

  const state: FlowGroupMatchingState = {
    phase,
    readyCount,
    totalPresent,
    isReady,
    group,
    isUngrouped,
  };

  return { state, toggleReady };
}
