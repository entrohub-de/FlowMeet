'use client';

import { useState, useEffect } from 'react';
import type { Event, Profile } from '@/types/domain';
import { Calendar, MapPin, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateRange, cn, isEventFree } from '@/lib/utils';
import { signupForEvent, cancelSignup, getUserSignupStatus, createCheckoutSession } from '@/lib/api/signup';

import { supabase } from '@/lib/supabase/client';
import PreferencesModal from './PreferencesModal';
import EventCardActions from './EventCardActions';


interface EventCardProps {
  event: Event;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  initialSignedUp?: boolean;
  onSignupChange?: (eventId: string, signedUp: boolean) => void;
  hostProfile?: Pick<Profile, 'nickname' | 'avatar_url'> | null;
  variant?: 'default' | 'signed-up';
  fadingOut?: boolean;
}

export default function EventCard({ event, locale, t, initialSignedUp, onSignupChange, fadingOut }: EventCardProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(initialSignedUp ?? false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialSignedUp === undefined);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      if (currentUserId) {
        if (initialSignedUp === undefined) {
          getUserSignupStatus(currentUserId, event.event_id).then((signupStatus) => {
            setSignedUp(signupStatus);
            setLoading(false);
          });
        }
      } else {
        setLoading(false);
      }
    });
  }, [event.event_id, initialSignedUp]);

  const handleSignup = async () => {
    if (!userId) {
      toast.error(t('ux.toast.loginRequired'));
      return;
    }

    setSigningUp(true);

    if (signedUp) {
      const success = await cancelSignup(event.event_id, userId);
      if (success) {
        setSignedUp(false);
        onSignupChange?.(event.event_id, false);
        toast.success(t('ux.toast.signupCancelled', { name: event.name }));
      }
    } else {
      if (!isEventFree(event)) {
        // Paid event: redirect to Stripe Checkout
        const url = await createCheckoutSession(event.event_id, userId);
        if (url) {
          window.location.href = url;
          return;
        } else {
          toast.error(t('ux.toast.paymentFailed'));
        }
      } else {
        // Free event: direct signup
        const success = await signupForEvent(event.event_id, userId);
        if (success) {
          setSignedUp(true);
          onSignupChange?.(event.event_id, true);
          toast.success(t('ux.toast.signupSuccess', { name: event.name }));
          setShowPreferencesModal(true);
          setSigningUp(false);
          return;
        }
      }
    }

    setSigningUp(false);
  };

  const location = event.venue?.name || t('user.locationTbd');
  const hasDescription = !!event.description;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl overflow-hidden transition-all duration-300 shadow-sm',
        fadingOut && 'opacity-0 scale-95 pointer-events-none',
      )}
    >
      <div className="flex">
        {/* Left: Cover image or date block */}
        {event.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image} alt={event.name} className="w-28 min-h-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-20 flex-shrink-0 bg-primary/5 flex flex-col items-center justify-center p-3">
            <span className="text-xs font-medium text-primary uppercase">
              {new Date(event.start_time).toLocaleDateString(locale, { month: 'short' })}
            </span>
            <span className="text-2xl font-bold text-foreground leading-tight">
              {new Date(event.start_time).getDate()}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(event.start_time).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Right: Content */}
        <div className="flex-1 p-4 space-y-2 min-w-0">
          {/* Title row */}
          <button
            type="button"
            onClick={() => hasDescription && setExpanded(!expanded)}
            className={cn(
              'w-full text-left',
              hasDescription && 'cursor-pointer'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground leading-tight">
                {event.name}
              </h3>
              {hasDescription && (
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform duration-200',
                    expanded && 'rotate-180'
                  )}
                />
              )}
            </div>
          </button>

          {/* Description */}
          {hasDescription && (
            <div
              className={cn(
                'overflow-hidden transition-all duration-200',
                expanded ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <p className="text-xs text-muted-foreground line-clamp-3 pb-1">
                {event.description}
              </p>
            </div>
          )}

          {/* Details: time + location */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" />
              {formatDateRange(event.start_time, event.end_time, locale)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
              {location}
            </span>
          </div>


          {/* Action area */}
          <EventCardActions
            loading={loading}
            signedUp={signedUp}
            signingUp={signingUp}
            userId={userId}
            onSignup={handleSignup}
            priceCents={event.price_cents}
            currency={event.currency}
            t={t}
          />
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferencesModal && userId && (
        <PreferencesModal
          eventId={event.event_id}
          userId={userId}
          t={t}
          onClose={() => setShowPreferencesModal(false)}
        />
      )}
    </div>
  );
}
