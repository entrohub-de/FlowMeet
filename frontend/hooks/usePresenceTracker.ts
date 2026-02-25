'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Lightweight presence tracker — joins the matching channel so the host can see
 * this user as "online". No matching logic, no ready state, just presence tracking.
 *
 * Skips if `skip` is true (e.g. when useFlowMatching already handles presence).
 */
export function usePresenceTracker(eventId: string, enabled: boolean, skip: boolean = false) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!enabled || skip || !eventId || !userId) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      return;
    }

    const channelName = `event:${eventId}:matching`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } },
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const now = new Date().toISOString();
        await channel.track({
          userId,
          ready: false,
          joinedAt: now,
          lastHeartbeat: now,
        });
      }
    });

    channelRef.current = channel;

    // Heartbeat every 15s
    const heartbeat = setInterval(async () => {
      if (channel.state !== 'joined') return;
      try {
        const state = channel.presenceState<{ userId: string; ready: boolean; joinedAt: string; lastHeartbeat: string }>();
        const me = Object.values(state).flat().find((p) => p.userId === userId);
        if (me) {
          await channel.track({ ...me, lastHeartbeat: new Date().toISOString() });
        }
      } catch {
        // channel may have closed
      }
    }, 15_000);

    return () => {
      clearInterval(heartbeat);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [enabled, skip, eventId, userId]);
}
