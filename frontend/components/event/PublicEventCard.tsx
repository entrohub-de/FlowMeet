'use client';

import type { Event } from '@/types/domain';
import { Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';

function formatDateRange(startStr: string, endStr: string, locale: string): string {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();

  const datePart = start.toLocaleDateString(loc, dateOpts);
  const startTime = start.toLocaleTimeString(loc, timeOpts);
  const endTime = end.toLocaleTimeString(loc, timeOpts);

  if (sameDay) {
    return `${datePart}  ${startTime} – ${endTime}`;
  }
  const endDate = end.toLocaleDateString(loc, dateOpts);
  return `${datePart} ${startTime} – ${endDate} ${endTime}`;
}

interface PublicEventCardProps {
  event: Event;
  locale: string;
  t: (key: string) => string;
}

export default function PublicEventCard({ event, locale, t }: PublicEventCardProps) {
  const location = event.venue?.name || t('user.locationTbd');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover Image */}
      {event.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_image} alt={event.name} className="w-full h-32 object-cover" />
      )}

      <div className="p-5 sm:p-6 space-y-4">
      {/* Title & Description */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground leading-tight">
          {event.name}
        </h3>
        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {event.description}
          </p>
        )}
      </div>

      {/* Details */}
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

      {/* Login Prompt */}
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
  );
}
