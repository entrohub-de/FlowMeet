import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, requireEventOwnership } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/flow — get current flow state */
export const GET = withApiHandler(async (_request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('session_active_flows')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw error;
  return apiSuccess(data);
});

/** PUT /api/v1/events/:eventId/flow — upsert flow state */
export const PUT = withApiHandler(async (request, { params }, keyInfo) => {
  const { eventId } = await params;
  await requireEventOwnership(eventId, keyInfo.agentName!);

  const body = await request.json();

  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_active_flows')
    .upsert(
      { event_id: eventId, ...body },
      { onConflict: 'event_id' }
    );

  if (error) throw error;
  return apiSuccess({ updated: true });
});

/** DELETE /api/v1/events/:eventId/flow — reset flow */
export const DELETE = withApiHandler(async (_request, { params }, keyInfo) => {
  const { eventId } = await params;
  await requireEventOwnership(eventId, keyInfo.agentName!);

  const supabase = createServerClient();

  const { error } = await supabase
    .from('session_active_flows')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
  return apiSuccess({ deleted: true });
});
