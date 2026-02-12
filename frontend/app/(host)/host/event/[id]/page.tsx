'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getEventSignups } from '@/lib/api/signup';
import type { Event, Signup } from '@/types/domain';
import { ArrowLeft } from 'lucide-react';
import EventInfoCard from '@/components/event/detail/EventInfoCard';
import StatsCard from '@/components/event/detail/StatsCard';
import ParticipantsCard from '@/components/event/detail/ParticipantsCard';
import ExpectationsCard from '@/components/event/detail/ExpectationsCard';

export default function EventDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load event details
        const events = await getEvents();
        const currentEvent = events.find(e => e.event_id === eventId);

        if (!currentEvent) {
          console.warn('Event not found:', eventId);
        }
        setEvent(currentEvent || null);

        // Load signups
        console.log('Loading signups for event:', eventId);
        const signupsData = await getEventSignups(eventId);
        console.log('Signups loaded:', signupsData.length, signupsData);
        setSignups(signupsData);
      } catch (err) {
        console.error('Failed to load event data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button
            onClick={() => router.push('/host/event')}
            className="px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t('host.events.notFound')}</p>
          <button
            onClick={() => router.push('/host/event')}
            className="px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const location = event.venue?.name || t('user.locationTbd');
  const signupsWithExpectations = signups.filter(s => s.expectation?.content);

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/host/event')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-muted-foreground">{event.description}</p>
            )}
          </div>
        </div>

        {/* Event Info Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <EventInfoCard event={event} location={location} />
          </div>
          <div className="lg:col-span-2">
            <StatsCard
              totalSignups={signups.length}
              withExpectations={signupsWithExpectations.length}
            />
          </div>
        </div>

        {/* Participants and Expectations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ParticipantsCard signups={signups} />
          {signupsWithExpectations.length > 0 && (
            <ExpectationsCard signups={signupsWithExpectations} />
          )}
        </div>
      </div>
    </div>
  );
}
