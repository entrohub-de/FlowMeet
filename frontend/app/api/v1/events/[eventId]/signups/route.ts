import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, requireParam } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/signups — list signups for an event */
export const GET = withApiHandler(async (_request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  // Get signups
  const { data: signups, error: signupsError } = await supabase
    .from('evt_signups')
    .select('signup_id, event_id, user_id, status, created_at, checked_in, checked_in_at')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (signupsError) throw signupsError;
  if (!signups || signups.length === 0) return apiSuccess([]);

  // Fetch profiles
  const userIds = signups.map((s) => s.user_id);
  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', userIds);

  const profilesMap = new Map((profiles || []).map((p) => [p.user_id, p]));

  const enriched = signups.map((s) => ({
    ...s,
    profile: profilesMap.get(s.user_id) || null,
  }));

  return apiSuccess(enriched);
});

/** POST /api/v1/events/:eventId/signups — sign up a user */
export const POST = withApiHandler(async (request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const body = await request.json();
  const userId = requireParam(body, 'userId');

  const supabase = createServerClient();
  const { error } = await supabase
    .from('evt_signups')
    .upsert(
      { event_id: eventId, user_id: userId, status: 'active' },
      { onConflict: 'event_id,user_id' }
    );

  if (error) throw error;
  return apiSuccess({ signedUp: true }, 201);
});
