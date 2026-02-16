'use client';

import type { Event } from '@/types/domain';
import { Calendar, MapPin } from 'lucide-react';
import { formatDateRange } from '@/lib/utils';

interface PastEventCardProps {
  event: Event;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function PastEventCard({ event, locale, t }: PastEventCardProps) {
  const location = event.venue?.name || t('user.locationTbd');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
      {event.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_image} alt={event.name} className="w-full h-24 object-cover grayscale-[30%]" />
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {event.name}
          </h3>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap bg-muted text-muted-foreground">
            {t('user.pastLabel')}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDateRange(event.start_time, event.end_time, locale)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {location}
          </span>
        </div>
      </div>
    </div>
  );
}
