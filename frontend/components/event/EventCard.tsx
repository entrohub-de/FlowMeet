'use client';

import { useState } from 'react';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, Clock } from 'lucide-react';

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

interface EventCardProps {
  event: Event;
  locale: string;
  t: (key: string) => string;
}

export default function EventCard({ event, locale, t }: EventCardProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const handleSignup = async () => {
    setSigningUp(true);
    // TODO: call actual signup API
    await new Promise((r) => setTimeout(r, 600));
    setSignedUp(true);
    setSigningUp(false);
  };

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

      {/* Sign Up Button */}
      <button
        onClick={handleSignup}
        disabled={signingUp || signedUp}
        className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          signedUp
            ? 'bg-muted text-muted-foreground cursor-default'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {signingUp
          ? '...'
          : signedUp
            ? t('user.signedUp')
            : t('user.signupBtn')}
      </button>
    </div>
  );
}
