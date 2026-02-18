import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

/** GET /api/v1/dashboard — host dashboard data */
export const GET = withApiHandler(async (_request, _context, _keyInfo) => {
  const supabase = createServerClient();

  const { data: events, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!events || events.length === 0) {
    return apiSuccess({
      events: [],
      totals: { totalEvents: 0, totalParticipants: 0, avgRating: null, thisMonthEvents: 0 },
    });
  }

  const eventIds = events.map((e) => e.event_id);

  const [signupsRes, ratingsRes] = await Promise.all([
    supabase.from('evt_signups').select('event_id, checked_in').eq('status', 'active').in('event_id', eventIds),
    supabase.from('rating_events').select('event_id, overall_score').in('event_id', eventIds),
  ]);

  const signupMap = new Map<string, { total: number; checkedIn: number }>();
  for (const s of signupsRes.data || []) {
    const entry = signupMap.get(s.event_id) || { total: 0, checkedIn: 0 };
    entry.total++;
    if (s.checked_in) entry.checkedIn++;
    signupMap.set(s.event_id, entry);
  }

  const ratingMap = new Map<string, { count: number; sum: number }>();
  for (const r of ratingsRes.data || []) {
    const entry = ratingMap.get(r.event_id) || { count: 0, sum: 0 };
    entry.count++;
    entry.sum += r.overall_score;
    ratingMap.set(r.event_id, entry);
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalParticipants = 0;
  let totalRatingSum = 0;
  let totalRatingCount = 0;
  let thisMonthEvents = 0;

  const enriched = events.map((e) => {
    const signup = signupMap.get(e.event_id) || { total: 0, checkedIn: 0 };
    const rating = ratingMap.get(e.event_id);

    totalParticipants += signup.total;
    if (rating) {
      totalRatingSum += rating.sum;
      totalRatingCount += rating.count;
    }
    if (new Date(e.start_time) >= monthStart) {
      thisMonthEvents++;
    }

    return {
      ...e,
      signup_count: signup.total,
      checkin_count: signup.checkedIn,
      rating_count: rating?.count ?? 0,
      avg_rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
    };
  });

  return apiSuccess({
    events: enriched,
    totals: {
      totalEvents: events.length,
      totalParticipants,
      avgRating: totalRatingCount > 0
        ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10
        : null,
      thisMonthEvents,
    },
  });
});
