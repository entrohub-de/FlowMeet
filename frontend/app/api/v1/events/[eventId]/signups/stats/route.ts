import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/signups/stats — checkin statistics */
export const GET = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('evt_signups')
    .select('checked_in')
    .eq('event_id', eventId)
    .eq('status', 'active');

  if (error) throw error;

  const total = data?.length ?? 0;
  const checkedIn = data?.filter((s) => s.checked_in).length ?? 0;

  return apiSuccess({ checkedIn, total });
});
