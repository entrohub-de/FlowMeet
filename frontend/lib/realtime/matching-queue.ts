import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MatchingPresenceState {
  userId: string;
  ready: boolean;
  joinedAt: string;
  lastHeartbeat: string;
}

export interface MatchAssignmentPayload {
  pairs: Array<{ user1Id: string; user2Id: string; matchId: string }>;
  unpaired?: string[];
  timestamp: string;
}

export interface GroupAssignmentPayload {
  groups: Array<{ groupId: string; memberIds: string[] }>;
  ungrouped?: string[];
  timestamp: string;
}

export interface MatchingQueueCallbacks {
  onPresenceSync: (readyUsers: MatchingPresenceState[], allUsers: MatchingPresenceState[]) => void;
  onMatchAssigned?: (payload: MatchAssignmentPayload) => void;
  onGroupAssigned?: (payload: GroupAssignmentPayload) => void;
}

const MATCHING_CHANNEL = (eventId: string) =>
  `event:${eventId}:matching`;

/**
 * Join the matching queue for an event.
 * Returns the channel for cleanup.
 */
export function joinMatchingQueue(
  eventId: string,
  userId: string,
  callbacks: MatchingQueueCallbacks
): RealtimeChannel {
  const channelName = MATCHING_CHANNEL(eventId);
  const channel = supabase.channel(channelName, {
    config: { presence: { key: userId } },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<MatchingPresenceState>();
      const allUsers: MatchingPresenceState[] = [];
      const readyUsers: MatchingPresenceState[] = [];
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          allUsers.push(p);
          if (p.ready) readyUsers.push(p);
        });
      });
      callbacks.onPresenceSync(readyUsers, allUsers);
    })
    .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
      callbacks.onMatchAssigned?.(payload as MatchAssignmentPayload);
    })
    .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
      callbacks.onGroupAssigned?.(payload as GroupAssignmentPayload);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const now = new Date().toISOString();
        await channel.track({
          userId,
          ready: false,
          joinedAt: now,
          lastHeartbeat: now,
        });

        // Start heartbeat interval: re-track presence every 15 seconds
        const heartbeatInterval = setInterval(async () => {
          try {
            const currentState = channel.presenceState<MatchingPresenceState>();
            const myPresence = Object.values(currentState)
              .flat()
              .find((p) => p.userId === userId);
            if (myPresence) {
              await channel.track({
                ...myPresence,
                lastHeartbeat: new Date().toISOString(),
              });
            }
          } catch {
            // Channel may have been closed
          }
        }, 15_000);

        // Store interval on channel for cleanup
        (channel as unknown as Record<string, unknown>).__heartbeatInterval = heartbeatInterval;
      }
    });

  // Patch unsubscribe to clear heartbeat interval
  const originalUnsubscribe = channel.unsubscribe.bind(channel);
  channel.unsubscribe = () => {
    const interval = (channel as unknown as Record<string, unknown>).__heartbeatInterval as ReturnType<typeof setInterval> | undefined;
    if (interval) clearInterval(interval);
    return originalUnsubscribe();
  };

  return channel;
}

/**
 * Toggle ready state in the matching queue.
 */
export async function setReady(
  channel: RealtimeChannel,
  userId: string,
  ready: boolean
): Promise<void> {
  await channel.track({
    userId,
    ready,
    joinedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
  });
}

/**
 * Detect stale users whose lastHeartbeat exceeds the given threshold (ms).
 */
export function getStaleUserIds(
  channel: RealtimeChannel,
  thresholdMs: number = 30_000
): string[] {
  const state = channel.presenceState<MatchingPresenceState>();
  const now = Date.now();
  const staleIds: string[] = [];
  Object.values(state).forEach((presences) => {
    presences.forEach((p) => {
      if (p.lastHeartbeat && now - new Date(p.lastHeartbeat).getTime() > thresholdMs) {
        staleIds.push(p.userId);
      }
    });
  });
  return staleIds;
}

/**
 * Host: observe matching queue (presence only, no track).
 */
export function observeMatchingQueue(
  eventId: string,
  callbacks: MatchingQueueCallbacks
): RealtimeChannel {
  const channelName = MATCHING_CHANNEL(eventId);
  console.log('[Host] observeMatchingQueue channel:', channelName);
  const channel = supabase.channel(channelName);

  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<MatchingPresenceState>();
      const allUsers: MatchingPresenceState[] = [];
      const readyUsers: MatchingPresenceState[] = [];
      Object.values(state).forEach((presences) => {
        presences.forEach((p) => {
          allUsers.push(p);
          if (p.ready) readyUsers.push(p);
        });
      });
      console.log(`[Host] presence sync: ${readyUsers.length} ready / ${allUsers.length} total`);
      callbacks.onPresenceSync(readyUsers, allUsers);
    })
    .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
      callbacks.onMatchAssigned?.(payload as MatchAssignmentPayload);
    })
    .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
      callbacks.onGroupAssigned?.(payload as GroupAssignmentPayload);
    })
    .subscribe((status) => {
      console.log(`[Host] observeMatchingQueue subscribe status: ${status}`);
    });

  return channel;
}

/**
 * Host: broadcast group assignments to all participants.
 */
export function broadcastGroupAssignments(
  eventId: string,
  payload: GroupAssignmentPayload
): void {
  const channelName = MATCHING_CHANNEL(eventId);
  const channel = supabase.channel(channelName);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'group_assigned',
        payload,
      });
      setTimeout(() => supabase.removeChannel(channel), 500);
    }
  });
}

/**
 * Host: broadcast match assignments to all participants.
 */
export function broadcastMatchAssignments(
  eventId: string,
  payload: MatchAssignmentPayload
): void {
  const channelName = MATCHING_CHANNEL(eventId);
  const channel = supabase.channel(channelName);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'match_assigned',
        payload,
      });
      setTimeout(() => supabase.removeChannel(channel), 500);
    }
  });
}
