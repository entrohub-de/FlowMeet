'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { getEvent } from '@/lib/api/events';
import { formatDateRange } from '@/lib/utils';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { t, locale } = useTranslation();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    getEvent(eventId)
      .then((data) => {
        if (data) {
          setEvent(data);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-4">
        <p className="text-lg font-medium text-foreground">
          {t('host.events.notFound')}
        </p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const location = event.venue?.name || t('user.locationTbd');

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('common.back')}
      </Link>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {event.cover_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image}
            alt={event.name}
            className="w-full h-48 sm:h-64 object-cover"
          />
        )}

        <div className="p-5 sm:p-6 space-y-5">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground">
              {event.name}
            </h1>
            {event.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0 text-primary" />
              <span>{formatDateRange(event.start_time, event.end_time, locale)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0 text-primary" />
              <span>{location}</span>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              {t('common.loginToSignup')}
            </p>
            <Link
              href="/login"
              className="w-full px-button h-button rounded-button font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-center flex items-center justify-center"
            >
              {t('home.login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
