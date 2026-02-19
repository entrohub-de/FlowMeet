'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  joinMatchingQueue,
  setReady as setReadyInQueue,
  type MatchAssignmentPayload,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { getParticipantState, upsertParticipantState } from '@/lib/api/participant-state';
import { getUserCheckinStatus } from '@/lib/api/checkin';
import type { Profile } from '@/types/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type FlowMatchingPhase = 'idle' | 'ready_prompt' | 'waiting' | 'matched';

export interface MatchPartner {
  userId: string;
  profile: Profile | null;
  matchId: string;
}

export interface FlowMatchingState {
  phase: FlowMatchingPhase;
  readyCount: number;
  totalPresent: number;
  isReady: boolean;
  partner: MatchPartner | null;
  isUnpaired: boolean;
  revealShown: boolean;
  matchScore: number | null;
  matchReasons: string[] | null;
  otherUserIds: string[];
}

export function useFlowMatching(
  eventId: string,
  stepId: string,
  stepStatus: string,
  pairingMode?: 'group' | '1v1'
) {
  const [phase, setPhase] = useState<FlowMatchingPhase>('idle');
  const [readyCount, setReadyCount] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [partner, setPartner] = useState<MatchPartner | null>(null);
  const [isUnpaired, setIsUnpaired] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [isCheckedIn, setIsCheckedIn] = useState<boolean | null>(null);
  const [revealShown, setRevealShown] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchReasons, setMatchReasons] = useState<string[] | null>(null);
  const [otherUserIds, setOtherUserIds] = useState<string[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);
  const recoveryAttemptedRef = useRef(false);
  const topicGeneratedRef = useRef(false);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // Check if user has checked in for this event
  useEffect(() => {
    if (!userId || !eventId) return;
    getUserCheckinStatus(userId, eventId)
      .then(statuses => setIsCheckedIn(statuses.some(s => s.checked_in)))
      .catch(() => setIsCheckedIn(false));
  }, [userId, eventId]);

  // State recovery: attempt to restore state from DB before joining queue
  useEffect(() => {
    if (pairingMode !== '1v1' || stepStatus !== 'active' || !userId || !eventId || !stepId) return;
    if (recoveryAttemptedRef.current || matchedRef.current) return;
    if (isCheckedIn !== true) return;

    recoveryAttemptedRef.current = true;

    const recover = async () => {
      try {
        const saved = await getParticipantState(eventId, userId);
        if (!saved || saved.flow_step_id !== stepId) return;

        if (saved.participant_status === 'matched' && saved.current_match_id) {
          // Fetch match to get partner ID
          const { data: match } = await supabase
            .from('match_records')
            .select('*')
            .eq('match_id', saved.current_match_id)
            .maybeSingle();

          if (match) {
            const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
            const { data: profiles } = await supabase
              .from('usr_profiles')
              .select('*')
              .eq('user_id', partnerId)
              .limit(1);

            setPartner({
              userId: partnerId,
              profile: (profiles?.[0] as Profile) ?? null,
              matchId: saved.current_match_id,
            });
            setIsUnpaired(false);
            setPhase('matched');
            matchedRef.current = true;
            setRevealShown(true); // Don't replay reveal on recovery
          }
        }
        // For 'ready' status, the queue join effect below will handle it naturally
      } catch (err) {
        console.error('State recovery failed:', err);
      }
    };

    recover();
  }, [pairingMode, stepStatus, userId, eventId, stepId, isCheckedIn]);

  // Join/leave matching queue based on step status
  // NOTE: phase is intentionally NOT in the dependency array to avoid
  // reconnecting when the user toggles ready or gets matched.
  useEffect(() => {
    if (pairingMode !== '1v1' || stepStatus !== 'active' || !userId || !eventId || !stepId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (pairingMode !== '1v1') {
        setPhase('idle');
        matchedRef.current = false;
      }
      return;
    }

    // Don't join queue if not checked in
    if (isCheckedIn !== true) return;

    // Already matched or already connected — don't rejoin
    if (matchedRef.current || channelRef.current) return;

    setPhase('ready_prompt');

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setReadyCount(readyUsers.length);
      setTotalPresent(allUsers.length);
      setOtherUserIds(allUsers.filter((u) => u.userId !== userId).map((u) => u.userId));
    };

    const handleMatchAssigned = async (payload: MatchAssignmentPayload) => {
      const myPair = payload.pairs.find(
        (p) => p.user1Id === userId || p.user2Id === userId
      );

      if (myPair) {
        const partnerId = myPair.user1Id === userId ? myPair.user2Id : myPair.user1Id;

        const { data: profiles } = await supabase
          .from('usr_profiles')
          .select('*')
          .eq('user_id', partnerId)
          .limit(1);

        setPartner({
          userId: partnerId,
          profile: (profiles?.[0] as Profile) ?? null,
          matchId: myPair.matchId,
        });
        setIsUnpaired(false);
        setPhase('matched');
        matchedRef.current = true;

        // Fetch match score and reasons for reveal animation
        Promise.resolve(
          supabase
            .from('match_records')
            .select('match_score, match_reasons')
            .eq('match_id', myPair.matchId)
            .single()
        )
          .then(({ data }) => {
            if (data) {
              setMatchScore(data.match_score);
              setMatchReasons(data.match_reasons);
            }
          })
          .catch(() => {});

        // Auto-generate conversation topics (silent degradation)
        if (!topicGeneratedRef.current) {
          topicGeneratedRef.current = true;
          import('@/lib/api/conversation-topics')
            .then(({ generateTopics }) => generateTopics(myPair.matchId))
            .catch(() => {});
        }

        // Persist matched state for recovery
        upsertParticipantState(eventId, userId, {
          flow_step_id: stepId,
          participant_status: 'matched',
          current_match_id: myPair.matchId,
          current_group_id: null,
        }).catch((err) => console.error('Failed to persist matched state:', err));
      } else if (payload.unpaired?.includes(userId)) {
        setIsUnpaired(true);
      }
    };

    const channel = joinMatchingQueue(eventId, stepId, userId, {
      onPresenceSync: handlePresenceSync,
      onMatchAssigned: handleMatchAssigned,
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairingMode, stepStatus, userId, eventId, stepId, isCheckedIn]);

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

  const markRevealShown = useCallback(() => {
    setRevealShown(true);
  }, []);

  const state: FlowMatchingState = {
    phase,
    readyCount,
    totalPresent,
    isReady,
    partner,
    isUnpaired,
    revealShown,
    matchScore,
    matchReasons,
    otherUserIds,
  };

  return { state, toggleReady, markRevealShown };
}
