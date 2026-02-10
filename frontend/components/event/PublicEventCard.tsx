'use client';

import type { Event } from '@/types/domain';
import { Calendar, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';

function formatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface PublicEventCardProps {
  event: Event;
  locale: string;
  t: (key: string) => string;
}

export default function PublicEventCard({ event, locale, t }: PublicEventCardProps) {
  const location = event.venue?.name || t('user.locationTbd');

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow space-y-4">
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
          <span>{formatDateTime(event.start_time, locale)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-primary" />
          <span>{formatDateTime(event.end_time, locale)}</span>
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
  );
}
