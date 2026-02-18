import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError, requireParam } from '@/lib/api-helpers';

const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

/** PATCH /api/v1/events/:eventId/status — update event status */
export const PATCH = withApiHandler(async (request, { params }) => {
  const { eventId } = await params;
  const body = await request.json();
  const status = requireParam(body, 'status');

  const validStatuses = ['active', 'cancelled', 'passed'];
  if (!validStatuses.includes(status)) {
    return apiError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 'VALIDATION_ERROR');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('evt_events')
    .update({ status })
    .eq('event_id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return apiSuccess(data);
});
