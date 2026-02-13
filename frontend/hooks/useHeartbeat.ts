'use client';

import { useEffect, useRef } from 'react';
import { heartbeat } from '@/lib/api/participant-state';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export function useHeartbeat(eventId: string | undefined, userId: string | null) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!eventId || !userId) return;

    const sendHeartbeat = () => {
      heartbeat(eventId, userId).catch((err) =>
        console.error('Heartbeat failed:', err)
      );
    };

    // Send immediately on mount
    sendHeartbeat();

    // Start interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Visibility change handler: send heartbeat when page becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [eventId, userId]);
}
