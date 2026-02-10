import { useState, useCallback } from 'react';
import type { ConversationTopic } from '@/types/domain';
import * as conversationTopicsAPI from '@/lib/api/conversation-topics';

interface UseConversationTopicsReturn {
  topics: ConversationTopic | null;
  loading: boolean;
  error: string | null;
  canGenerate: {
    allowed: boolean;
    reason?: string;
    minutesRemaining?: number;
  };
  generateTopics: (matchId: string) => Promise<void>;
  loadTopics: (matchId: string) => Promise<void>;
  checkCanGenerate: (matchId: string) => Promise<void>;
}

export function useConversationTopics(): UseConversationTopicsReturn {
  const [topics, setTopics] = useState<ConversationTopic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canGenerate, setCanGenerate] = useState<{
    allowed: boolean;
    reason?: string;
    minutesRemaining?: number;
  }>({ allowed: true });

  const generateTopics = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    try {
      const generatedTopics = await conversationTopicsAPI.generateTopics(matchId);
      setTopics(generatedTopics);
      setCanGenerate({ allowed: false, reason: 'Topics just generated' });
    } catch (err: any) {
      console.error('Error generating topics:', err);
      setError(err.message || 'Failed to generate topics');

      // If it's a rate limit error, update canGenerate state
      if (err.message.includes('generate new topics in')) {
        const match = err.message.match(/(\d+) minutes?/);
        const minutesRemaining = match ? parseInt(match[1]) : undefined;
        setCanGenerate({
          allowed: false,
          reason: err.message,
          minutesRemaining,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTopics = useCallback(async (matchId: string) => {
    setLoading(true);
    setError(null);

    try {
      const existingTopics = await conversationTopicsAPI.getTopics(matchId);
      setTopics(existingTopics);

      // Also check if we can generate new topics
      const canGenerateResult = await conversationTopicsAPI.canGenerateTopics(matchId);
      setCanGenerate(canGenerateResult);
    } catch (err: any) {
      console.error('Error loading topics:', err);
      setError(err.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkCanGenerate = useCallback(async (matchId: string) => {
    try {
      const result = await conversationTopicsAPI.canGenerateTopics(matchId);
      setCanGenerate(result);
    } catch (err: any) {
      console.error('Error checking generation limits:', err);
    }
  }, []);

  return {
    topics,
    loading,
    error,
    canGenerate,
    generateTopics,
    loadTopics,
    checkCanGenerate,
  };
}
