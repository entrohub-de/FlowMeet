import { supabase } from '@/lib/supabase/client';
import type { Event, EventStatus } from '@/types/domain';

/** Reusable select query with venue join */
const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

/**
 * 获取所有活动（关联场地信息）
 */
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * 获取单个活动详情（通过 event_id）
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .eq('event_id', eventId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 获取单个活动详情（通过 event_code）
 */
export async function getEventByCode(eventCode: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .eq('event_code', eventCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 更新活动
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Pick<Event, 'name' | 'description' | 'start_time' | 'end_time' | 'venue_id' | 'cover_image' | 'status'>>
): Promise<Event> {
  const { data, error } = await supabase
    .from('evt_events')
    .update(updates)
    .eq('event_id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 创建活动（主持人使用，自动设置 created_by）
 */
export async function createEvent(
  event: Pick<Event, 'name' | 'description' | 'start_time' | 'end_time' | 'venue_id'> & { cover_image?: string | null }
): Promise<Event> {
  const { data: { session } } = await supabase.auth.getSession();

  const { data, error } = await supabase
    .from('evt_events')
    .insert([{ ...event, created_by: session?.user?.id ?? null }])
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新活动状态
 */
export async function updateEventStatus(eventId: string, status: EventStatus): Promise<Event> {
  return updateEvent(eventId, { status });
}

/**
 * 删除活动
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase
    .from('evt_events')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
}

/**
 * Host Dashboard 聚合数据
 */
export interface HostEventSummary extends Event {
  signup_count: number;
  checkin_count: number;
  rating_count: number;
  avg_rating: number | null;
}

export interface HostDashboardData {
  events: HostEventSummary[];
  totals: {
    totalEvents: number;
    totalParticipants: number;
    avgRating: number | null;
    thisMonthEvents: number;
  };
}

export async function getHostDashboardData(): Promise<HostDashboardData> {
  const { data: events, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!events || events.length === 0) {
    return {
      events: [],
      totals: { totalEvents: 0, totalParticipants: 0, avgRating: null, thisMonthEvents: 0 },
    };
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

  const enriched: HostEventSummary[] = events.map((e) => {
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

  return {
    events: enriched,
    totals: {
      totalEvents: events.length,
      totalParticipants,
      avgRating: totalRatingCount > 0
        ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10
        : null,
      thisMonthEvents,
    },
  };
}
