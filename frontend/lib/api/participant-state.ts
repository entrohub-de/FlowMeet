import { supabase } from '@/lib/supabase/client';
import type { ParticipantState } from '@/types/domain';

export async function getParticipantState(
  eventId: string,
  userId: string
): Promise<ParticipantState | null> {
  const { data, error } = await supabase
    .from('evt_participant_state')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as ParticipantState | null;
}

export async function upsertParticipantState(
  eventId: string,
  userId: string,
  patch: Partial<Pick<ParticipantState, 'flow_step_id' | 'participant_status' | 'current_match_id' | 'current_group_id' | 'is_online'>>
): Promise<void> {
  const { error } = await supabase
    .from('evt_participant_state')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        ...patch,
        last_connected_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    );

  if (error) throw error;
}

export async function heartbeat(
  eventId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('evt_participant_state')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        last_heartbeat_at: new Date().toISOString(),
        last_connected_at: new Date().toISOString(),
        is_online: true,
      },
      { onConflict: 'event_id,user_id' }
    );

  if (error) throw error;
}
