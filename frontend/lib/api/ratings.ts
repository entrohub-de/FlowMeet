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
    .from('evt_event_ratings')
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
    .from('evt_event_ratings')
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
    .from('evt_match_ratings')
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
    .from('evt_matches')
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
    .from('evt_match_ratings')
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
    .from('evt_match_ratings')
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
    .from('evt_match_quality_ratings')
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
    .from('evt_match_quality_ratings')
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
    .from('evt_topic_ratings')
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
    .from('evt_topic_ratings')
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
  const { data, error } = await supabase
    .from('evt_matches')
    .select('*, user1_profile:usr_profiles!user1_id(*), user2_profile:usr_profiles!user2_id(*)')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user matches:', error);
    throw error;
  }

  return data || [];
}
