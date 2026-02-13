import { supabase } from '@/lib/supabase/client';
import type { HostAction, HostActionType } from '@/types/domain';

/**
 * Log a host action (fire-and-forget).
 * Errors are silently caught to avoid disrupting host operations.
 */
export function logHostAction(
  eventId: string,
  actionType: HostActionType,
  metadata?: Record<string, any>,
  targetStepId?: string
): void {
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase
      .from('evt_host_actions')
      .insert({
        event_id: eventId,
        host_user_id: user.id,
        action_type: actionType,
        target_step_id: targetStepId ?? null,
        metadata: metadata ?? {},
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log host action:', error);
      });
  });
}

/**
 * Fetch all host actions for an event, ordered by most recent first.
 */
export async function getHostActions(eventId: string): Promise<HostAction[]> {
  const { data, error } = await supabase
    .from('evt_host_actions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as HostAction[];
}

/**
 * Host manually pairs two users.
 * Uses the host_upsert_match RPC and logs the action.
 */
export async function manualPair(
  eventId: string,
  user1Id: string,
  user2Id: string
): Promise<string> {
  const { data, error } = await supabase.rpc('host_upsert_match', {
    p_event_id: eventId,
    p_user1_id: user1Id,
    p_user2_id: user2Id,
    p_status: 'accepted',
  });

  if (error) throw error;

  const matchId = data as string;

  logHostAction(eventId, 'manual_pair', {
    user1_id: user1Id,
    user2_id: user2Id,
    match_id: matchId,
  });

  return matchId;
}

/**
 * Host manually unpairs a match (sets status to 'declined').
 */
export async function manualUnpair(
  matchId: string,
  eventId: string
): Promise<void> {
  const { error } = await supabase
    .from('match_records')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('match_id', matchId);

  if (error) throw error;

  logHostAction(eventId, 'manual_unpair', { match_id: matchId });
}
