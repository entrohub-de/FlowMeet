'use client';

import { useState, useEffect } from 'react';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, QrCode, CheckCircle2, X } from 'lucide-react';
import { toast } from 'sonner';
import { signupForEvent, cancelSignup, getUserSignupStatus } from '@/lib/api/signup';
import { getUserCheckinStatus } from '@/lib/api/checkin';
import { supabase } from '@/lib/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import PreferencesModal from './PreferencesModal';
import SwipeToSignup from './SwipeToSignup';

function generateNumericCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return (Math.abs(hash) % 900000 + 100000).toString();
}

function generateQRValue(eventId: string, userId: string, checkinCode: string): string {
  return btoa(`${eventId}/${userId}/${checkinCode}`);
}

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

interface EventCardProps {
  event: Event;
  locale: string;
  t: (key: string) => string;
  initialSignedUp?: boolean;
  onSignupChange?: (eventId: string, signedUp: boolean) => void;
}

export default function EventCard({ event, locale, t, initialSignedUp, onSignupChange }: EventCardProps) {
  const [signingUp, setSigningUp] = useState(false);
  const [signedUp, setSignedUp] = useState(initialSignedUp ?? false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialSignedUp === undefined);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUserId = session?.user?.id || null;
      setUserId(currentUserId);

      if (currentUserId) {
        if (initialSignedUp !== undefined) {
          // Signup status already known from parent, only fetch checkin
          getUserCheckinStatus(currentUserId, event.event_id).then((checkinStatuses) => {
            setIsCheckedIn(checkinStatuses.some((s) => s.checked_in));
          });
        } else {
          // Fetch both signup and checkin status
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

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover Image */}
      {event.cover_image && (
        <img src={event.cover_image} alt={event.name} className="w-full h-32 object-cover" />
      )}

      <div className="p-4 space-y-2.5">
      {/* Title & Description */}
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground leading-tight">
          {event.name}
        </h3>
        {event.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span>{formatDateRange(event.start_time, event.end_time, locale)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span>{location}</span>
        </div>
      </div>

      {/* Sign Up */}
      {loading ? (
        <div className="w-full h-button flex items-center justify-center text-sm text-muted-foreground">
          {t('common.loading')}
        </div>
      ) : signedUp ? (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium text-sm inline-flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {t('user.signedUp')}
          </span>
          <button
            onClick={handleSignup}
            disabled={signingUp}
            className="px-3 py-1 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border hover:border-destructive/30 font-medium text-sm transition-colors inline-flex items-center gap-1"
          >
            {signingUp ? '...' : <><X className="w-3.5 h-3.5" />{t('user.cancelSignup')}</>}
          </button>
        </div>
      ) : (
        <SwipeToSignup
          label={t('user.swipeToSignup')}
          disabled={signingUp || !userId}
          onSwipeComplete={handleSignup}
        />
      )}

      {/* Checkin Section - only for signed-up users with checkin code */}
      {signedUp && event.checkin_code && userId && (
        <div className="border-t border-border pt-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t('user.checkinStatus')}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isCheckedIn
                  ? 'bg-green-100 text-green-700'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
            </span>
          </div>

          {!isCheckedIn && (
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              {showQR ? t('user.hideCheckinCode') : t('user.showCheckinCode')}
            </button>
          )}

          {!isCheckedIn && showQR && (
            <div className="space-y-2">
              {event.checkin_qr_enabled && (
                <div className="flex justify-center p-4 bg-white rounded-xl border border-border">
                  <QRCodeSVG
                    value={generateQRValue(event.event_id, userId, event.checkin_code)}
                    size={160}
                    level="H"
                  />
                </div>
              )}
              <div className="text-xl font-mono text-center text-foreground font-bold tracking-widest">
                {generateNumericCode(event.event_id, userId, event.checkin_code)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preferences Modal - shown after signup or when editing */}
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
