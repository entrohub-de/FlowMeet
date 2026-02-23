'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  joinMatchingQueue,
  setReady as setReadyInQueue,
  type GroupAssignmentPayload,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { getParticipantState, upsertParticipantState } from '@/lib/api/participant-state';
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
  const recoveryAttemptedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // State recovery: attempt to restore state from DB before joining queue
  useEffect(() => {
    if (pairingMode !== 'group' || stepStatus !== 'active' || !userId || !eventId || !stepId) return;
    if (recoveryAttemptedRef.current || groupedRef.current) return;

    recoveryAttemptedRef.current = true;

    const recover = async () => {
      try {
        const saved = await getParticipantState(eventId, userId);
        if (!saved || saved.flow_step_id !== stepId) return;

        if (saved.participant_status === 'matched' && saved.current_group_id) {
          // Fetch group members
          const { data: members } = await supabase
            .from('evt_group_members')
            .select('user_id')
            .eq('group_id', saved.current_group_id);

          if (members && members.length > 0) {
            const memberIds = members.map((m: { user_id: string }) => m.user_id);
            const { data: profiles } = await supabase
              .from('usr_profiles')
              .select('*')
              .in('user_id', memberIds);

            const groupMembers: GroupMemberInfo[] = memberIds.map((id: string) => ({
              userId: id,
              profile: (profiles?.find((p) => p.user_id === id) as Profile) ?? null,
            }));

            setGroup({ groupId: saved.current_group_id, members: groupMembers });
            setIsUngrouped(false);
            setPhase('grouped');
            groupedRef.current = true;
          }
        }
      } catch (err) {
        console.error('Group state recovery failed:', err);
      }
    };

    recover();
  }, [pairingMode, stepStatus, userId, eventId, stepId]);

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

        // Persist grouped state for recovery
        upsertParticipantState(eventId, userId, {
          flow_step_id: stepId,
          participant_status: 'matched',
          current_match_id: null,
          current_group_id: myGroup.groupId,
        }).catch((err) => console.error('Failed to persist grouped state:', err));
      } else if (payload.ungrouped?.includes(userId)) {
        setIsUngrouped(true);
      }
    };

    const channel = joinMatchingQueue(eventId, userId, {
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

    // Persist ready state for recovery
    upsertParticipantState(eventId, userId, {
      flow_step_id: stepId,
      participant_status: newReady ? 'ready' : 'waiting',
    }).catch((err) => console.error('Failed to persist ready state:', err));
  }, [isReady, userId, eventId, stepId]);

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
