import { useEffect, useState } from 'react';
import type { Event } from '@/types/domain';
import { subscribeToEvent, subscribeToPresence } from '@/lib/realtime/subscribe';

interface EventLiveState {
  event: Event | null;
  presenceCount: number;
  announcements: any[];
  currentPoll: any | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * 活动现场的 hook - 聚合 realtime 数据和事件状态
 */
export function useEventLive(eventId: string) {
  const [state, setState] = useState<EventLiveState>({
    event: null,
    presenceCount: 0,
    announcements: [],
    currentPoll: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!eventId) return;

    // 订阅活动更新
    const eventChannel = subscribeToEvent(eventId, (payload) => {
      console.log('Event update:', payload);
      // 根据更新类型处理数据
    });

    // 订阅参与者在线状态
    const presenceChannel = subscribeToPresence(eventId, (state) => {
      const count = Object.keys(state).length;
      setState((prev) => ({ ...prev, presenceCount: count }));
    });

    return () => {
      eventChannel.unsubscribe();
      presenceChannel.unsubscribe();
    };
  }, [eventId]);

  return state;
}
