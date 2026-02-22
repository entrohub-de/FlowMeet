'use client';

import { useState, useEffect } from 'react';
import type { Event, Profile } from '@/types/domain';
import { Calendar, MapPin, ChevronDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { formatDateRange } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { signupForEvent, cancelSignup, getUserSignupStatus } from '@/lib/api/signup';
import { getUserCheckinStatus } from '@/lib/api/checkin';
import { supabase } from '@/lib/supabase/client';
import PreferencesModal from './PreferencesModal';
import EventCardActions from './EventCardActions';
import EventCardCheckin from './EventCardCheckin';

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

export default function EventCard({ event, locale, t, initialSignedUp, onSignupChange, hostProfile, variant = 'default', fadingOut }: EventCardProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(initialSignedUp ?? false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialSignedUp === undefined);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      if (currentUserId) {
        if (initialSignedUp !== undefined) {
          getUserCheckinStatus(currentUserId, event.event_id).then((checkinStatuses) => {
            setIsCheckedIn(checkinStatuses.some((s) => s.checked_in));
          });
        } else {
          Promise.all([
            getUserSignupStatus(currentUserId, event.event_id),
            getUserCheckinStatus(currentUserId, event.event_id),
          ]).then(([signupStatus, checkinStatuses]) => {
            setSignedUp(signupStatus);
            setIsCheckedIn(checkinStatuses.some((s) => s.checked_in));
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

    setSigningUp(false);
  };

  const location = event.venue?.name || t('user.locationTbd');
  const hasDescription = !!event.description;

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-2xl overflow-hidden transition-all duration-300',
        variant === 'signed-up' && 'border-l-[3px] border-l-primary',
        fadingOut && 'opacity-0 scale-95 pointer-events-none',
      )}
    >
      {/* Cover Image */}
      {event.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_image} alt={event.name} className="w-full h-32 object-cover" />
      ) : (
        <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-accent/40" />
      )}

      <div className="p-4 space-y-3">
        {/* Title row */}
        <button
          type="button"
          onClick={() => hasDescription && setExpanded(!expanded)}
          className={cn(
            'w-full text-left space-y-1',
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

        {/* Host info */}
        {hostProfile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {hostProfile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hostProfile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-3 h-3 text-primary" />
              </div>
            )}
            <span>{t('user.hostedBy', { name: hostProfile.nickname || t('user.unknownHost') })}</span>
          </div>
        )}

        {/* Action area */}
        <EventCardActions
          loading={loading}
          signedUp={signedUp}
          signingUp={signingUp}
          userId={userId}
          onSignup={handleSignup}
          t={t}
        />

        {/* Checkin Section */}
        {signedUp && userId && (
          <EventCardCheckin
            event={event}
            userId={userId}
            isCheckedIn={isCheckedIn}
            t={t}
          />
        )}

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
    </div>
  );
}
