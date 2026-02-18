import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/events/:eventId/analytics — aggregated event analytics */
export const GET = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  // Fetch event + signups + ratings + match quality ratings in parallel
  const [eventRes, signupsRes, ratingsRes, matchQualityRes, matchesRes] = await Promise.all([
    supabase.from('evt_events').select('event_id, name, start_time, end_time, status').eq('event_id', eventId).single(),
    supabase.from('evt_signups').select('checked_in').eq('event_id', eventId).eq('status', 'active'),
    supabase.from('rating_events').select('overall_score, organization_score, venue_score').eq('event_id', eventId),
    supabase.from('rating_match_quality').select('score').eq('event_id', eventId),
    supabase.from('match_records').select('match_id, status').eq('event_id', eventId),
  ]);

  if (eventRes.error) throw eventRes.error;

  const signups = signupsRes.data || [];
  const ratings = ratingsRes.data || [];
  const matchQuality = matchQualityRes.data || [];
  const matches = matchesRes.data || [];

  const totalSignups = signups.length;
  const totalCheckedIn = signups.filter((s) => s.checked_in).length;

  const avgOverall = ratings.length > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.overall_score, 0) / ratings.length) * 10) / 10
    : null;
  const avgOrganization = ratings.filter((r) => r.organization_score != null).length > 0
    ? Math.round((ratings.filter((r) => r.organization_score != null).reduce((sum, r) => sum + r.organization_score!, 0) / ratings.filter((r) => r.organization_score != null).length) * 10) / 10
    : null;
  const avgVenue = ratings.filter((r) => r.venue_score != null).length > 0
    ? Math.round((ratings.filter((r) => r.venue_score != null).reduce((sum, r) => sum + r.venue_score!, 0) / ratings.filter((r) => r.venue_score != null).length) * 10) / 10
    : null;

  const avgMatchQuality = matchQuality.length > 0
    ? Math.round((matchQuality.reduce((sum, r) => sum + r.score, 0) / matchQuality.length) * 10) / 10
    : null;

  return apiSuccess({
    event: eventRes.data,
    signups: { total: totalSignups, checkedIn: totalCheckedIn },
    ratings: {
      count: ratings.length,
      avgOverall,
      avgOrganization,
      avgVenue,
    },
    matchQuality: {
      count: matchQuality.length,
      avgScore: avgMatchQuality,
    },
    matches: {
      total: matches.length,
      accepted: matches.filter((m) => m.status === 'accepted').length,
      completed: matches.filter((m) => m.status === 'completed').length,
    },
  });
});
