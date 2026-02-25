'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getPreferences } from '@/lib/api/profile';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type IdentityType = 'engineering' | 'non_engineering';

export interface IdentityParticipant {
  userId: string;
  identity: IdentityType | null;
  nickname: string;
}

interface IdentityPresence {
  userId: string;
  identity: IdentityType | null;
  nickname: string;
}

export interface GroupIdentityState {
  myIdentity: IdentityType | null;
  participants: IdentityParticipant[];
  totalCount: number;
  engineeringCount: number;
  nonEngineeringCount: number;
}

const CHANNEL_NAME = (eventId: string) => `event:${eventId}:group-identity`;

function inferIdentity(industryBackground: string | null): IdentityType {
  if (!industryBackground) return 'non_engineering';
  return industryBackground.includes('engineer') ? 'engineering' : 'non_engineering';
}

export function useGroupIdentity(eventId: string, enabled: boolean) {
  const [myIdentity, setMyIdentity] = useState<IdentityType | null>(null);
  const [participants, setParticipants] = useState<IdentityParticipant[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const identityRef = useRef<IdentityType | null>(null);

  // Get user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // Load preferences and profile, infer identity
  useEffect(() => {
    if (!userId || !enabled) return;

    const load = async () => {
      try {
        const [prefs, { data: profile }] = await Promise.all([
          getPreferences(userId),
          supabase.from('usr_profiles').select('nickname').eq('user_id', userId).maybeSingle(),
        ]);
        const inferred = inferIdentity(prefs?.industry_background ?? null);
        identityRef.current = inferred;
        setMyIdentity(inferred);
        setNickname(profile?.nickname ?? '');
      } catch (err) {
        console.error('Failed to load identity data:', err);
      }
    };
    load();
  }, [userId, enabled]);

  // Join/leave channel
  useEffect(() => {
    if (!enabled || !userId || !eventId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setParticipants([]);
      return;
    }

    // Wait for identity to be loaded
    if (identityRef.current === null && myIdentity === null) return;

    const channelName = CHANNEL_NAME(eventId);
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<IdentityPresence>();
        const seen = new Map<string, IdentityParticipant>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            seen.set(p.userId, {
              userId: p.userId,
              identity: p.identity,
              nickname: p.nickname,
            });
          });
        });
        setParticipants(Array.from(seen.values()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            identity: identityRef.current,
            nickname,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, userId, eventId, myIdentity, nickname]);

  // Switch identity
  const setIdentity = useCallback(async (id: IdentityType) => {
    identityRef.current = id;
    setMyIdentity(id);
    if (channelRef.current) {
      await channelRef.current.track({
        userId: userId!,
        identity: id,
        nickname,
      });
    }
  }, [userId, nickname]);

  const engineeringCount = participants.filter(p => p.identity === 'engineering').length;
  const nonEngineeringCount = participants.filter(p => p.identity === 'non_engineering').length;

  const state: GroupIdentityState = {
    myIdentity,
    participants,
    totalCount: participants.length,
    engineeringCount,
    nonEngineeringCount,
  };

  return { state, setIdentity };
}
