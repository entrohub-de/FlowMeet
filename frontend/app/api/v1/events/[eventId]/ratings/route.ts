import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/ratings — event ratings list */
export const GET = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('rating_events')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return apiSuccess([]);

  // Fetch nicknames
  const userIds = data.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('user_id, nickname')
    .in('user_id', userIds);

  const nickMap = new Map((profiles || []).map((p) => [p.user_id, p.nickname as string | null]));

  const enriched = data.map((r) => ({
    rating_id: r.rating_id,
    user_id: r.user_id,
    nickname: nickMap.get(r.user_id) || null,
    overall_score: r.overall_score,
    organization_score: r.organization_score,
    venue_score: r.venue_score,
    comment: r.comment,
    created_at: r.created_at,
  }));

  return apiSuccess(enriched);
});
