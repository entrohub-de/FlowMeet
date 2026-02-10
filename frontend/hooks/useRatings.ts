import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/context';
import type {
  Event,
  EventRating,
  MatchRating,
  MatchQualityRating,
  Match,
} from '@/types/domain';
import * as ratingsAPI from '@/lib/api/ratings';

interface UseRatingsReturn {
  // Events
  events: Event[];
  selectedEventId: string;
  setSelectedEventId: (id: string) => void;

  // Event rating
  eventRating: EventRating | null;
  submitEventRating: (data: {
    overall_score: number;
    organization_score?: number;
    venue_score?: number;
    comment?: string;
  }) => Promise<void>;

  // Match quality rating
  matchQualityRating: MatchQualityRating | null;
  submitMatchQualityRating: (score: number, comment?: string) => Promise<void>;

  // Match partner ratings
  matches: Match[];
  matchRatings: Record<string, MatchRating>;
  submitMatchRating: (matchId: string, score: number, comment?: string) => Promise<void>;

  // Loading states
  loading: boolean;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;

  // User ID
  userId: string | null;
}

export function useRatings(): UseRatingsReturn {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [userId, setUserId] = useState<string | null>(null);

  // Ratings state
  const [eventRating, setEventRating] = useState<EventRating | null>(null);
  const [matchQualityRating, setMatchQualityRating] = useState<MatchQualityRating | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchRatings, setMatchRatings] = useState<Record<string, MatchRating>>({});

  // UI state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };

    getCurrentUser();
  }, []);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('evt_events')
          .select('*')
          .order('start_time', { ascending: false });

        if (error) throw error;

        setEvents(data || []);
        if (data && data.length > 0 && !selectedEventId) {
          setSelectedEventId(data[0].event_id);
        }
      } catch (err: any) {
        console.error('Error loading events:', err);
        setError(err.message);
      }
    };

    loadEvents();
  }, [selectedEventId]);

  // Load ratings when event or user changes
  useEffect(() => {
    if (!selectedEventId || !userId) return;

    const loadRatings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Load all ratings in parallel
        const [eventRatingData, matchQualityData, matchesData, matchRatingsData] =
          await Promise.all([
            ratingsAPI.getEventRating(selectedEventId, userId),
            ratingsAPI.getMatchQualityRating(selectedEventId, userId),
            ratingsAPI.getUserMatchesForRating(selectedEventId, userId),
            ratingsAPI.getEventMatchRatings(selectedEventId, userId),
          ]);

        setEventRating(eventRatingData);
        setMatchQualityRating(matchQualityData);
        setMatches(matchesData);

        // Convert match ratings array to record for easy lookup
        const ratingsMap: Record<string, MatchRating> = {};
        matchRatingsData.forEach((rating) => {
          ratingsMap[rating.match_id] = rating;
        });
        setMatchRatings(ratingsMap);
      } catch (err: any) {
        console.error('Error loading ratings:', err);
        setError(err.message || 'Failed to load ratings');
      } finally {
        setLoading(false);
      }
    };

    loadRatings();
  }, [selectedEventId, userId]);

  // Submit event rating
  const submitEventRating = useCallback(
    async (data: {
      overall_score: number;
      organization_score?: number;
      venue_score?: number;
      comment?: string;
    }) => {
      if (!selectedEventId || !userId) return;

      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const rating = await ratingsAPI.upsertEventRating(selectedEventId, userId, data);
        setEventRating(rating);
        setSuccessMessage(t('rating.submitted'));
      } catch (err: any) {
        console.error('Error submitting event rating:', err);
        setError(err.message || t('rating.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [selectedEventId, userId, t]
  );

  // Submit match quality rating
  const submitMatchQualityRating = useCallback(
    async (score: number, comment?: string) => {
      if (!selectedEventId || !userId) return;

      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const rating = await ratingsAPI.upsertMatchQualityRating(
          selectedEventId,
          userId,
          score,
          comment
        );
        setMatchQualityRating(rating);
        setSuccessMessage(t('rating.submitted'));
      } catch (err: any) {
        console.error('Error submitting match quality rating:', err);
        setError(err.message || t('rating.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [selectedEventId, userId, t]
  );

  // Submit match partner rating
  const submitMatchRating = useCallback(
    async (matchId: string, score: number, comment?: string) => {
      if (!userId) return;

      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      try {
        const rating = await ratingsAPI.upsertMatchRating(matchId, userId, score, comment);
        setMatchRatings((prev) => ({ ...prev, [matchId]: rating }));
        setSuccessMessage(t('rating.submitted'));
      } catch (err: any) {
        console.error('Error submitting match rating:', err);
        setError(err.message || t('rating.error'));
      } finally {
        setSubmitting(false);
      }
    },
    [userId, t]
  );

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    eventRating,
    submitEventRating,
    matchQualityRating,
    submitMatchQualityRating,
    matches,
    matchRatings,
    submitMatchRating,
    loading,
    submitting,
    error,
    successMessage,
    userId,
  };
}
