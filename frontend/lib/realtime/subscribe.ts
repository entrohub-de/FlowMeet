import { supabase } from '@/lib/supabase/client';

/**
 * Realtime 频道命名规范
 */
export const CHANNEL_NAMES = {
  event: (eventId: string) => `event:${eventId}`,
  stage: (eventId: string, stageId: string) => `event:${eventId}:stage:${stageId}`,
  presence: (eventId: string) => `event:${eventId}:presence`,
  flow: (eventId: string) => `event:${eventId}:flow`,
} as const;

/**
 * 订阅活动的 realtime 更新
 */
export function subscribeToEvent(
  eventId: string,
  callback: (payload: unknown) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel(CHANNEL_NAMES.event(eventId))
    .on('broadcast', { event: 'update' }, (payload) => {
      callback(payload);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Subscribed to event ${eventId}`);
      } else if (status === 'CHANNEL_ERROR') {
        onError?.(new Error(`Failed to subscribe to event ${eventId}`));
      }
    });

  return channel;
}

/**
 * 订阅活动的参与者在线状态
 */
export function subscribeToPresence(
  eventId: string,
  callback: (state: Record<string, unknown>) => void
) {
  const channel = supabase
    .channel(CHANNEL_NAMES.presence(eventId), {
      config: { broadcast: { self: true } },
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      callback(state);
    })
    .subscribe();

  return channel;
}
