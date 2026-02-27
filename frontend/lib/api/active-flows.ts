import { supabase } from '@/lib/supabase/client';
import type { ActiveFlow, ActiveFlowPermissions, ActiveFlowStep } from '@/types/domain';

export async function getActiveFlow(eventId: string): Promise<ActiveFlow | null> {
  const { data, error } = await supabase
    .from('session_active_flows')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data as ActiveFlow | null;
}

export async function upsertActiveFlow(
  eventId: string,
  payload: {
    template_id?: string | null;
    template_name?: string;
    flow_status?: string;
    steps?: ActiveFlowStep[];
    active_step_id?: string | null;
    active_step_started_at?: string | null;
    active_step_remaining_seconds?: number | null;
    started_at?: string | null;
    completed_at?: string | null;
    permissions?: ActiveFlowPermissions;
  }
): Promise<void> {
  const { error } = await supabase
    .from('session_active_flows')
    .upsert(
      { event_id: eventId, ...payload },
      { onConflict: 'event_id' }
    );

  if (error) throw error;
}

export async function deleteActiveFlow(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('session_active_flows')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
}
