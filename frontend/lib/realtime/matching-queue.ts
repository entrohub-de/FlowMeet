import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface MatchingPresenceState {
  userId: string;
  ready: boolean;
  joinedAt: string;
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

const MATCHING_CHANNEL = (eventId: string, stepId: string) =>
  `event:${eventId}:matching:${stepId}`;

/**
 * Join the matching queue for a specific flow step.
 * Returns the channel for cleanup.
 */
export function joinMatchingQueue(
  eventId: string,
  stepId: string,
  userId: string,
  callbacks: MatchingQueueCallbacks
): RealtimeChannel {
  const channelName = MATCHING_CHANNEL(eventId, stepId);
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
        await channel.track({
          userId,
          ready: false,
          joinedAt: new Date().toISOString(),
        });
      }
    });

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
  });
}

/**
 * Host: observe matching queue (presence only, no track).
 */
export function observeMatchingQueue(
  eventId: string,
  stepId: string,
  callbacks: MatchingQueueCallbacks
): RealtimeChannel {
  const channelName = MATCHING_CHANNEL(eventId, stepId);
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
      callbacks.onPresenceSync(readyUsers, allUsers);
    })
    .on('broadcast', { event: 'match_assigned' }, ({ payload }) => {
      callbacks.onMatchAssigned?.(payload as MatchAssignmentPayload);
    })
    .on('broadcast', { event: 'group_assigned' }, ({ payload }) => {
      callbacks.onGroupAssigned?.(payload as GroupAssignmentPayload);
    })
    .subscribe();

  return channel;
}

/**
 * Host: broadcast group assignments to all participants.
 */
export function broadcastGroupAssignments(
  eventId: string,
  stepId: string,
  payload: GroupAssignmentPayload
): void {
  const channelName = MATCHING_CHANNEL(eventId, stepId);
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
  stepId: string,
  payload: MatchAssignmentPayload
): void {
  const channelName = MATCHING_CHANNEL(eventId, stepId);
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
