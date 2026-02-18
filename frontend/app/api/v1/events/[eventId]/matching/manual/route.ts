import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, requireParam } from '@/lib/api-helpers';

/** POST /api/v1/events/:eventId/matching/manual — manually pair two users */
export const POST = withApiHandler(async (request, { params }) => {
  const { eventId } = await params;
  const body = await request.json();
  const user1Id = requireParam(body, 'user1Id');
  const user2Id = requireParam(body, 'user2Id');
  const activeModuleId: string | undefined = body.activeModuleId;

  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('host_upsert_match', {
    p_event_id: eventId,
    p_user1_id: user1Id,
    p_user2_id: user2Id,
    p_status: 'accepted',
    p_active_module_id: activeModuleId ?? null,
  });

  if (error) throw error;

  return apiSuccess({ matchId: data as string, user1Id, user2Id }, 201);
});
