'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  joinMatchingQueue,
  setReady as setReadyInQueue,
  broadcastPartnerLeft,
  type MatchAssignmentPayload,
  type MatchingPresenceState,
  type PartnerLeftPayload,
} from '@/lib/realtime/matching-queue';
import { getParticipantState, upsertParticipantState } from '@/lib/api/participant-state';
import type { Profile } from '@/types/domain';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ready    = "准备好了"按钮
// matching = 匹配中，等待配对
// chatting = 对话中（已匹配）
// left     = 已离开
export type FlowMatchingPhase = 'idle' | 'ready' | 'matching' | 'chatting' | 'left';

export interface MatchPartner {
  userId: string;
  profile: Profile | null;
  matchId: string;
}

export interface FlowMatchingState {
  phase: FlowMatchingPhase;
  readyCount: number;
  totalPresent: number;
  partner: MatchPartner | null;
  isUnpaired: boolean;
}

export function useFlowMatching(
  eventId: string,
  pairingMode?: 'group' | '1v1',
  enabled?: boolean
) {
  const [phase, setPhase] = useState<FlowMatchingPhase>('idle');
  const [readyCount, setReadyCount] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [partner, setPartnerState] = useState<MatchPartner | null>(null);
  const [isUnpaired, setIsUnpaired] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchedRef = useRef(false);
  const partnerRef = useRef<MatchPartner | null>(null);
  const recoveryAttemptedRef = useRef(false);
  const [joinTrigger, setJoinTrigger] = useState(0);

  // 同步更新 state + ref
  const setPartner = useCallback((p: MatchPartner | null) => {
    partnerRef.current = p;
    setPartnerState(p);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // State recovery from DB
  useEffect(() => {
    if (pairingMode !== '1v1' || !enabled || !userId || !eventId) return;
    if (recoveryAttemptedRef.current || matchedRef.current) return;

    recoveryAttemptedRef.current = true;

    const recover = async () => {
      try {
        const saved = await getParticipantState(eventId, userId);
        if (!saved) return;

        if (saved.participant_status === 'matched' && saved.current_match_id) {
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
            setPhase('chatting');
            matchedRef.current = true;
          }
        } else if (saved.participant_status === 'left') {
          setPhase('left');
        }
      } catch (err) {
        console.error('State recovery failed:', err);
      }
    };

    recover();
  }, [pairingMode, enabled, userId, eventId, setPartner]);

  // Join/leave matching queue
  useEffect(() => {
    if (pairingMode !== '1v1' || !enabled || !userId || !eventId) {
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

    if (matchedRef.current || channelRef.current) return;
    if (phase === 'left') return;

    setPhase('ready');

    const handlePresenceSync = (
      readyUsers: MatchingPresenceState[],
      allUsers: MatchingPresenceState[]
    ) => {
      setReadyCount(readyUsers.length);
      setTotalPresent(allUsers.length);

      // 兜底：如果处于 chatting 但 partner 已离开 channel，自动重置
      if (matchedRef.current && partnerRef.current) {
        const partnerStillHere = allUsers.some(u => u.userId === partnerRef.current!.userId);
        if (!partnerStillHere) {
          setPartner(null);
          setIsUnpaired(false);
          setPhase('ready');
          matchedRef.current = false;
          upsertParticipantState(eventId, userId, {
            participant_status: 'waiting',
            current_match_id: null,
          }).catch(() => {});
        }
      }
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

        // 立即将 presence ready 设为 false，防止被再次匹配
        if (channelRef.current) {
          setReadyInQueue(channelRef.current, userId, false).catch(() => {});
        }

        setPartner({
          userId: partnerId,
          profile: (profiles?.[0] as Profile) ?? null,
          matchId: myPair.matchId,
        });
        setIsUnpaired(false);
        setPhase('chatting');
        matchedRef.current = true;

        upsertParticipantState(eventId, userId, {
          flow_step_id: null,
          participant_status: 'matched',
          current_match_id: myPair.matchId,
          current_group_id: null,
        }).catch((err) => console.error('Failed to persist matched state:', err));
      } else if (payload.unpaired?.includes(userId)) {
        setIsUnpaired(true);
      }
    };

    const handlePartnerLeft = (payload: PartnerLeftPayload) => {
      if (!matchedRef.current) return;
      // 精确匹配：只有离开者是自己的 partner 时才重置
      if (partnerRef.current?.userId !== payload.userId) return;
      setPartner(null);
      setIsUnpaired(false);
      setPhase('ready');
      matchedRef.current = false;
      upsertParticipantState(eventId, userId, {
        participant_status: 'waiting',
        current_match_id: null,
      }).catch((err) => console.error('Failed to reset after partner left:', err));
    };

    const channel = joinMatchingQueue(eventId, userId, {
      onPresenceSync: handlePresenceSync,
      onMatchAssigned: handleMatchAssigned,
      onPartnerLeft: handlePartnerLeft,
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairingMode, enabled, userId, eventId, joinTrigger, setPartner]);

  // "准备好了" → 进入匹配队列
  const goReady = useCallback(async () => {
    if (!channelRef.current || !userId) return;
    setPhase('matching');
    await setReadyInQueue(channelRef.current, userId, true);
    upsertParticipantState(eventId, userId, {
      flow_step_id: null,
      participant_status: 'ready',
    }).catch((err) => console.error('Failed to persist ready state:', err));
  }, [userId, eventId]);

  // "取消匹配" → 回到准备
  const cancelReady = useCallback(async () => {
    if (!channelRef.current || !userId) return;
    setPhase('ready');
    await setReadyInQueue(channelRef.current, userId, false);
    upsertParticipantState(eventId, userId, {
      flow_step_id: null,
      participant_status: 'waiting',
    }).catch((err) => console.error('Failed to persist cancel state:', err));
  }, [userId, eventId]);

  // 广播 partner_left 并等待消息发出后再断开 channel
  const notifyAndDisconnect = useCallback(async () => {
    if (!channelRef.current) return;
    if (partnerRef.current) {
      broadcastPartnerLeft(channelRef.current, userId!, partnerRef.current.matchId);
      // 等待 WebSocket 将消息刷出
      await new Promise(r => setTimeout(r, 200));
    }
    channelRef.current.unsubscribe();
    channelRef.current = null;
  }, [userId]);

  // "完成对话" → 通知对方，回到准备，重新加入队列
  const finishChat = useCallback(async () => {
    if (!userId || !eventId) return;
    await notifyAndDisconnect();
    setPartner(null);
    setIsUnpaired(false);
    matchedRef.current = false;
    recoveryAttemptedRef.current = false;
    await upsertParticipantState(eventId, userId, {
      participant_status: 'waiting',
      current_match_id: null,
    });
    setJoinTrigger(n => n + 1);
  }, [userId, eventId, setPartner, notifyAndDisconnect]);

  // "离开" → 通知对方，退出匹配
  const leave = useCallback(async () => {
    if (!userId || !eventId) return;
    await notifyAndDisconnect();
    setPhase('left');
    setPartner(null);
    setIsUnpaired(false);
    matchedRef.current = false;
    await upsertParticipantState(eventId, userId, {
      participant_status: 'left',
      current_match_id: null,
    });
  }, [userId, eventId, setPartner, notifyAndDisconnect]);

  // "重新加入" → 从 left 回到 ready
  const rejoin = useCallback(async () => {
    if (!userId || !eventId) return;
    recoveryAttemptedRef.current = false;
    await upsertParticipantState(eventId, userId, {
      participant_status: 'waiting',
      current_match_id: null,
    });
    setJoinTrigger(n => n + 1);
  }, [userId, eventId]);

  const state: FlowMatchingState = {
    phase,
    readyCount,
    totalPresent,
    partner,
    isUnpaired,
  };

  return { state, goReady, cancelReady, finishChat, leave, rejoin };
}
