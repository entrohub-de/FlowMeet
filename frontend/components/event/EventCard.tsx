'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { signupForEvent, cancelSignup, getUserSignupStatus } from '@/lib/api/signup';
import { supabase } from '@/lib/supabase/client';

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
  const router = useRouter();
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      // Check if already signed up
      if (currentUserId) {
        getUserSignupStatus(currentUserId, event.event_id).then((status) => {
          setSignedUp(status);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [event.event_id]);

  const handleSignup = async () => {
    if (!userId) {
      // User not logged in, redirect to login or show message
      alert(t('common.loginRequired') || '请先登录');
      return;
    }

    setSigningUp(true);

    if (signedUp) {
      // Cancel signup
      const success = await cancelSignup(event.event_id, userId);
      if (success) {
        setSignedUp(false);
      }
    } else {
      // Sign up
      const success = await signupForEvent(event.event_id, userId);
      if (success) {
        setSignedUp(true);
        router.push(`/user/event/${event.event_id}/preferences`);
        return;
      }
    }

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
        disabled={loading || signingUp}
        className={`w-full px-button h-button rounded-button font-medium text-sm transition-colors ${
          signedUp
            ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
            : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
        }`}
      >
        {loading
          ? t('common.loading')
          : signingUp
            ? '...'
            : signedUp
              ? t('user.signedUp')
              : t('user.signupBtn')}
      </button>
    </div>
  );
}
