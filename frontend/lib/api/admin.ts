import { supabase } from '@/lib/supabase/client';
import type { UserRole } from './role';
import type { HostAction } from '@/types/domain';

// ── Shared helpers ──

/** Fetch nicknames for a list of user IDs → Map<userId, nickname> */
async function fetchNicknameMap(userIds: string[]): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase
    .from('usr_profiles')
    .select('user_id, nickname')
    .in('user_id', userIds);
  return new Map((data || []).map((p) => [p.user_id, p.nickname as string | null]));
}

/** Fetch profiles (nickname, gender, age_group) for user IDs */
async function fetchProfileMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { nickname: string | null; gender: string | null; age_group: string | null }>();
  const { data } = await supabase
    .from('usr_profiles')
    .select('user_id, nickname, gender, age_group')
    .in('user_id', userIds);
  return new Map(
    (data || []).map((p) => [p.user_id, {
      nickname: p.nickname || null,
      gender: p.gender || null,
      age_group: p.age_group || null,
    }])
  );
}

// ── User management ──

export interface UserWithRole {
  user_id: string;
  email: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
  role: UserRole;
  created_at: string | null;
}

/**
 * Get users with roles + profiles, optionally filtered by role.
 */
async function getUsersByRole(roleFilter?: UserRole): Promise<UserWithRole[]> {
  let query = supabase
    .from('usr_role')
    .select('user_id, role, created_at')
    .order('created_at', { ascending: false });

  if (roleFilter) {
    query = query.eq('role', roleFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const profileMap = await fetchProfileMap(data.map((r) => r.user_id));

  return data.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      user_id: r.user_id,
      email: '',
      nickname: profile?.nickname || null,
      gender: profile?.gender || null,
      age_group: profile?.age_group || null,
      role: r.role as UserRole,
      created_at: r.created_at,
    };
  });
}

export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  return getUsersByRole();
}

export async function getHostUsers(): Promise<UserWithRole[]> {
  return getUsersByRole('host');
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<void> {
  const { error } = await supabase
    .from('usr_role')
    .update({ role: newRole })
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Host Applications ──

export interface HostApplicationWithProfile {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  nickname: string | null;
}

export async function getHostApplications(): Promise<HostApplicationWithProfile[]> {
  const { data, error } = await supabase
    .from('usr_host_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const nickMap = await fetchNicknameMap(data.map((a) => a.user_id));

  return data.map((a) => ({
    id: a.id,
    user_id: a.user_id,
    status: a.status,
    created_at: a.created_at,
    reviewed_at: a.reviewed_at,
    reviewed_by: a.reviewed_by,
    nickname: nickMap.get(a.user_id) || null,
  }));
}

export async function approveHostApplication(applicationId: string, userId: string): Promise<void> {
  // Update application status
  const { error: appError } = await supabase
    .from('usr_host_applications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (appError) throw appError;

  // Update user role to host
  const { error: roleError } = await supabase
    .from('usr_role')
    .update({ role: 'host' })
    .eq('user_id', userId);
  if (roleError) throw roleError;
}

export async function rejectHostApplication(applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('usr_host_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw error;
}

// ── Event overview ──

export interface AdminEventSummary {
  event_id: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  signup_count: number;
  checkin_count: number;
  rating_count: number;
  avg_rating: number | null;
}

export async function getAdminEventsList(): Promise<AdminEventSummary[]> {
  const { data: events, error } = await supabase
    .from('evt_events')
    .select('event_id, name, start_time, end_time, status')
    .order('start_time', { ascending: false });

  if (error) throw error;
  if (!events || events.length === 0) return [];

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

  return events.map((e) => {
    const signup = signupMap.get(e.event_id) || { total: 0, checkedIn: 0 };
    const rating = ratingMap.get(e.event_id);
    return {
      event_id: e.event_id,
      name: e.name,
      start_time: e.start_time,
      end_time: e.end_time,
      status: e.status,
      signup_count: signup.total,
      checkin_count: signup.checkedIn,
      rating_count: rating?.count ?? 0,
      avg_rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
    };
  });
}

// ── Event detail ──

export interface AdminEventRating {
  rating_id: string;
  user_id: string;
  nickname: string | null;
  overall_score: number;
  organization_score: number | null;
  venue_score: number | null;
  comment: string | null;
  created_at: string;
}

export interface AdminMatchQualityRating {
  rating_id: string;
  user_id: string;
  nickname: string | null;
  score: number;
  comment: string | null;
  created_at: string;
}

export async function getAdminEventRatings(eventId: string): Promise<AdminEventRating[]> {
  const { data, error } = await supabase
    .from('rating_events')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const nickMap = await fetchNicknameMap(data.map((r) => r.user_id));

  return data.map((r) => ({
    rating_id: r.rating_id,
    user_id: r.user_id,
    nickname: nickMap.get(r.user_id) || null,
    overall_score: r.overall_score,
    organization_score: r.organization_score,
    venue_score: r.venue_score,
    comment: r.comment,
    created_at: r.created_at,
  }));
}

export async function getAdminMatchQualityRatings(eventId: string): Promise<AdminMatchQualityRating[]> {
  const { data, error } = await supabase
    .from('rating_match_quality')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const nickMap = await fetchNicknameMap(data.map((r) => r.user_id));

  return data.map((r) => ({
    rating_id: r.rating_id,
    user_id: r.user_id,
    nickname: nickMap.get(r.user_id) || null,
    score: r.score,
    comment: r.comment,
    created_at: r.created_at,
  }));
}

export async function getAdminHostActions(eventId: string): Promise<(HostAction & { host_nickname: string | null })[]> {
  const { data, error } = await supabase
    .from('evt_host_actions')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const nickMap = await fetchNicknameMap([...new Set(data.map((a) => a.host_user_id))]);

  return data.map((a) => ({
    ...a,
    host_nickname: nickMap.get(a.host_user_id) || null,
  })) as (HostAction & { host_nickname: string | null })[];
}
