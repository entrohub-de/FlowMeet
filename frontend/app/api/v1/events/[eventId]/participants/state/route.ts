import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/participants/state — participant state overview */
export const GET = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('evt_participant_state')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw error;
  return apiSuccess(data || []);
});
