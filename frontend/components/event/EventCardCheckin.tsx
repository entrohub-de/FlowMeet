'use client';

import { useState } from 'react';
import type { Event } from '@/types/domain';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

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

interface EventCardCheckinProps {
  event: Event;
  userId: string;
  isCheckedIn: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function EventCardCheckin({ event, userId, isCheckedIn, t }: EventCardCheckinProps) {
  const [showQR, setShowQR] = useState(false);

  if (!event.checkin_code) return null;

  return (
    <div className="border-t border-border pt-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{t('user.checkinStatus')}</span>
        <span
          className={cn(
            'px-2.5 py-0.5 rounded-full text-xs font-medium',
            isCheckedIn
              ? 'bg-green-100 text-green-700'
              : 'bg-muted text-muted-foreground'
          )}
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
  );
}
