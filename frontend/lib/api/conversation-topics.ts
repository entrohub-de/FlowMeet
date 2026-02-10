import { supabase } from '@/lib/supabase/client';
import type { ConversationTopic } from '@/types/domain';

/**
 * Generate AI-powered conversation topics for a match
 * @param matchId The match ID to generate topics for
 * @returns The generated conversation topics
 */
export async function generateTopics(matchId: string): Promise<ConversationTopic> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-conversation-topics', {
      body: { matchId },
    });

    if (error) {
      console.error('Error generating topics:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from topic generation');
    }

    // Handle rate limit error
    if (data.error) {
      throw new Error(data.message || data.error);
    }

    return data as ConversationTopic;
  } catch (error: unknown) {
    console.error('Error in generateTopics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate conversation topics';
    throw new Error(errorMessage);
  }
}

/**
 * Get existing conversation topics for a match
 * @param matchId The match ID to get topics for
 * @returns The conversation topics or null if none exist
 */
export async function getTopics(matchId: string): Promise<ConversationTopic | null> {
  try {
    const { data, error } = await supabase
      .from('evt_conversation_topics')
      .select('*')
      .eq('match_id', matchId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching topics:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getTopics:', error);
    throw error;
  }
}

/**
 * Check if topics can be generated for a match (rate limiting)
 * @param matchId The match ID to check
 * @returns Whether generation is allowed and optional reason
 */
export async function canGenerateTopics(matchId: string): Promise<{
  allowed: boolean;
  reason?: string;
  minutesRemaining?: number;
}> {
  try {
    const { data, error } = await supabase
      .rpc('can_generate_topics', { p_match_id: matchId });

    if (error) {
      console.error('Error checking generation limits:', error);
      return { allowed: true }; // Fail open
    }

    if (!data) {
      // Get the last generation time
      const { data: lastTopic } = await supabase
        .from('evt_conversation_topics')
        .select('generated_at')
        .eq('match_id', matchId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTopic) {
        const minutesRemaining = Math.ceil(
          60 - (Date.now() - new Date(lastTopic.generated_at).getTime()) / 1000 / 60
        );

        return {
          allowed: false,
          reason: `You can generate new topics in ${minutesRemaining} minutes`,
          minutesRemaining,
        };
      }
    }

    return { allowed: Boolean(data) };
  } catch (error) {
    console.error('Error in canGenerateTopics:', error);
    return { allowed: true }; // Fail open
  }
}
