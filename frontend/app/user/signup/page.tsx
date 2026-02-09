'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import EventCard from '@/components/event/EventCard';

export default function SignupPage() {
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          {t('user.signup')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('user.signupDesc')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-lg font-medium text-foreground">{t('user.noEvents')}</p>
          <p className="text-sm text-muted-foreground">{t('user.noEventsDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {events.map((event) => (
            <EventCard key={event.event_id} event={event} locale={locale} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
