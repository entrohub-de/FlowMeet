import { supabase } from '@/lib/supabase/client';
import type {
  EventRating,
  MatchRating,
  MatchQualityRating,
  TopicRating,
  Match,
} from '@/types/domain';

// ============================================================================
// EVENT RATINGS
// ============================================================================

/**
 * Get user's rating for an event
 */
export async function getEventRating(
  eventId: string,
  userId: string
): Promise<EventRating | null> {
  const { data, error } = await supabase
    .from('rating_events')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event rating:', error);
    throw error;
  }

  return data;
}

/**
 * Create or update event rating
 */
export async function upsertEventRating(
  eventId: string,
  userId: string,
  data: {
    overall_score: number;
    organization_score?: number;
    venue_score?: number;
    comment?: string;
  }
): Promise<EventRating> {
  const { data: rating, error } = await supabase
    .from('rating_events')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        overall_score: data.overall_score,
        organization_score: data.organization_score || null,
        venue_score: data.venue_score || null,
        comment: data.comment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting event rating:', error);
    throw error;
  }

  return rating;
}

// ============================================================================
// MATCH PARTNER RATINGS
// ============================================================================

/**
 * Get user's rating for a specific match
 */
export async function getMatchRating(
  matchId: string,
  userId: string
): Promise<MatchRating | null> {
  const { data, error } = await supabase
    .from('rating_matches')
    .select('*')
    .eq('match_id', matchId)
    .eq('rater_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching match rating:', error);
    throw error;
  }

  return data;
}

/**
 * Get all match ratings for an event by user
 */
export async function getEventMatchRatings(
  eventId: string,
  userId: string
): Promise<MatchRating[]> {
  // First get all matches for this event and user
  const { data: matches, error: matchesError } = await supabase
    .from('match_records')
    .select('match_id')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (matchesError) {
    console.error('Error fetching matches:', matchesError);
    throw matchesError;
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  const matchIds = matches.map((m) => m.match_id);

  // Get ratings for these matches
  const { data, error } = await supabase
    .from('rating_matches')
    .select('*')
    .in('match_id', matchIds)
    .eq('rater_user_id', userId);

  if (error) {
    console.error('Error fetching match ratings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create or update match rating
 */
export async function upsertMatchRating(
  matchId: string,
  userId: string,
  score: number,
  comment?: string
): Promise<MatchRating> {
  const { data, error } = await supabase
    .from('rating_matches')
    .upsert(
      {
        match_id: matchId,
        rater_user_id: userId,
        score,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'match_id,rater_user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting match rating:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// MATCH QUALITY RATINGS
// ============================================================================

/**
 * Get user's match quality rating for an event
 */
export async function getMatchQualityRating(
  eventId: string,
  userId: string
): Promise<MatchQualityRating | null> {
  const { data, error } = await supabase
    .from('rating_match_quality')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching match quality rating:', error);
    throw error;
  }

  return data;
}

/**
 * Create or update match quality rating
 */
export async function upsertMatchQualityRating(
  eventId: string,
  userId: string,
  score: number,
  comment?: string
): Promise<MatchQualityRating> {
  const { data, error } = await supabase
    .from('rating_match_quality')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        score,
        comment: comment || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting match quality rating:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// TOPIC QUALITY RATINGS
// ============================================================================

/**
 * Get user's rating for a topic
 */
export async function getTopicRating(
  topicId: string,
  userId: string
): Promise<TopicRating | null> {
  const { data, error } = await supabase
    .from('rating_topics')
    .select('*')
    .eq('topic_id', topicId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching topic rating:', error);
    throw error;
  }

  return data;
}

/**
 * Create or update topic rating
 */
export async function upsertTopicRating(
  topicId: string,
  userId: string,
  score: number,
  comment?: string
): Promise<TopicRating> {
  const { data, error } = await supabase
    .from('rating_topics')
    .upsert(
      {
        topic_id: topicId,
        user_id: userId,
        score,
        comment: comment || null,
      },
      { onConflict: 'topic_id,user_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting topic rating:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user's matches for an event (for rating partners)
 */
export async function getUserMatchesForRating(
  eventId: string,
  userId: string
): Promise<Match[]> {
  // First get the matches
  const { data: matches, error } = await supabase
    .from('match_records')
    .select('*')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user matches:', error);
    throw error;
  }

  if (!matches || matches.length === 0) {
    return [];
  }

  // Get all related user profiles
  const userIds = new Set<string>();
  matches.forEach((match) => {
    userIds.add(match.user1_id);
    userIds.add(match.user2_id);
  });

  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', Array.from(userIds));

  // Merge the data
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return matches.map((match) => ({
    ...match,
    user1_profile: profileMap.get(match.user1_id),
    user2_profile: profileMap.get(match.user2_id),
  }));
}
