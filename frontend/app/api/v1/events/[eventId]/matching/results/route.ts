import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/matching/results — get all match results for an event */
export const GET = withApiHandler(async (request, { params }) => {
  const { eventId } = await params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  const supabase = createServerClient();

  let query = supabase
    .from('match_records')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  }

  const { data: matches, error } = await query;
  if (error) throw error;
  if (!matches || matches.length === 0) return apiSuccess([]);

  // Fetch profiles
  const userIds = new Set<string>();
  matches.forEach((m) => {
    userIds.add(m.user1_id);
    userIds.add(m.user2_id);
  });

  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', Array.from(userIds));

  const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  const enriched = matches.map((m) => ({
    ...m,
    user1_profile: profileMap.get(m.user1_id) || null,
    user2_profile: profileMap.get(m.user2_id) || null,
  }));

  return apiSuccess(enriched);
});
