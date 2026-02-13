'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  joinMatchingQueue,
  setReady as setReadyInQueue,
  type MatchAssignmentPayload,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
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

  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

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

    // Already matched or already connected — don't rejoin
    if (matchedRef.current || channelRef.current) return;

    setPhase('ready_prompt');

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setReadyCount(readyUsers.length);
      setTotalPresent(allUsers.length);
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
  }, [pairingMode, stepStatus, userId, eventId, stepId]);

  const toggleReady = useCallback(async () => {
    if (!channelRef.current || !userId) return;
    const newReady = !isReady;
    setIsReady(newReady);
    setPhase(newReady ? 'waiting' : 'ready_prompt');
    await setReadyInQueue(channelRef.current, userId, newReady);
  }, [isReady, userId]);

  const state: FlowMatchingState = {
    phase,
    readyCount,
    totalPresent,
    isReady,
    partner,
    isUnpaired,
  };

  return { state, toggleReady };
}
