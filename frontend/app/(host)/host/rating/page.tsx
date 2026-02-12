'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import type { Event } from '@/types/domain';
import { EventSelector } from '@/components/expectations/EventSelector';

interface EventRatingRow {
  overall_score: number;
  organization_score: number | null;
  venue_score: number | null;
}

interface MatchQualityRow {
  score: number;
}

interface MatchRatingRow {
  score: number;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, n) => acc + n, 0);
  return sum / values.length;
}

function fmt(score: number): string {
  return score === 0 ? '-' : score.toFixed(2);
}

export default function HostRatingStatsPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventRatings, setEventRatings] = useState<EventRatingRow[]>([]);
  const [matchQualityRatings, setMatchQualityRatings] = useState<MatchQualityRow[]>([]);
  const [matchRatings, setMatchRatings] = useState<MatchRatingRow[]>([]);

  useEffect(() => {
    const loadEvents = async () => {
      const { data, error: eventsError } = await supabase
        .from('evt_events')
        .select('*')
        .order('start_time', { ascending: false });

      if (eventsError) {
        setError(eventsError.message);
        return;
      }

      const list = data || [];
      setEvents(list);
      if (list.length > 0) {
        setSelectedEventId((prev) => prev || list[0].event_id);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    const loadStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const eventRatingsPromise = supabase
          .from('rating_events')
          .select('overall_score,organization_score,venue_score')
          .eq('event_id', selectedEventId);

        const matchQualityPromise = supabase
          .from('rating_match_quality')
          .select('score')
          .eq('event_id', selectedEventId);

        const eventMatchesPromise = supabase
          .from('evt_matches')
          .select('match_id')
          .eq('event_id', selectedEventId);

        const [eventRatingsRes, matchQualityRes, eventMatchesRes] = await Promise.all([
          eventRatingsPromise,
          matchQualityPromise,
          eventMatchesPromise,
        ]);

        if (eventRatingsRes.error) throw eventRatingsRes.error;
        if (matchQualityRes.error) throw matchQualityRes.error;
        if (eventMatchesRes.error) throw eventMatchesRes.error;

        const ids = (eventMatchesRes.data || []).map((m) => m.match_id);
        let matchRatingsData: MatchRatingRow[] = [];

        if (ids.length > 0) {
          const { data, error: matchRatingsError } = await supabase
            .from('rating_matches')
            .select('score')
            .in('match_id', ids);

          if (matchRatingsError) throw matchRatingsError;
          matchRatingsData = data || [];
        }

        setEventRatings((eventRatingsRes.data || []) as EventRatingRow[]);
        setMatchQualityRatings((matchQualityRes.data || []) as MatchQualityRow[]);
        setMatchRatings(matchRatingsData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load rating stats';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [selectedEventId]);

  const metrics = useMemo(() => {
    const overall = avg(eventRatings.map((r) => r.overall_score));
    const organization = avg(
      eventRatings
        .map((r) => r.organization_score)
        .filter((v): v is number => v !== null && v !== undefined)
    );
    const venue = avg(
      eventRatings
        .map((r) => r.venue_score)
        .filter((v): v is number => v !== null && v !== undefined)
    );
    const matchQuality = avg(matchQualityRatings.map((r) => r.score));
    const matchPartner = avg(matchRatings.map((r) => r.score));

    return {
      eventRatingCount: eventRatings.length,
      matchQualityCount: matchQualityRatings.length,
      matchPartnerCount: matchRatings.length,
      overall,
      organization,
      venue,
      matchQuality,
      matchPartner,
    };
  }, [eventRatings, matchQualityRatings, matchRatings]);

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
            {t('pages.rating.title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">{t('user.ratingPageDesc')}</p>
        </div>

        <EventSelector
          events={events}
          selectedEventId={selectedEventId}
          onEventChange={setSelectedEventId}
        />

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : selectedEventId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Event Ratings</div>
              <div className="text-2xl font-semibold">{metrics.eventRatingCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">{t('rating.event.overallScore')}</div>
              <div className="text-2xl font-semibold">{fmt(metrics.overall)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">
                {t('rating.event.organizationScore')}
              </div>
              <div className="text-2xl font-semibold">{fmt(metrics.organization)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">{t('rating.event.venueScore')}</div>
              <div className="text-2xl font-semibold">{fmt(metrics.venue)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Match Quality Ratings</div>
              <div className="text-2xl font-semibold">{metrics.matchQualityCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">{t('rating.matchQuality.title')}</div>
              <div className="text-2xl font-semibold">{fmt(metrics.matchQuality)}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">Partner Ratings</div>
              <div className="text-2xl font-semibold">{metrics.matchPartnerCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm text-muted-foreground mb-1">{t('rating.matchPartner.title')}</div>
              <div className="text-2xl font-semibold">{fmt(metrics.matchPartner)}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">{t('user.selectEvent')}</div>
        )}
      </div>
    </div>
  );
}
