'use client';

import { Event } from '@/types/domain';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/lib/i18n/context';

interface EventCheckinCardProps {
  event: Event;
  userId: string;
  isCheckedIn: boolean;
}

function generateNumericCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const code = Math.abs(hash) % 900000 + 100000;
  return code.toString();
}

function generateQRCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  return btoa(raw);
}

export function EventCheckinCard({ event, userId, isCheckedIn }: EventCheckinCardProps) {
  const { t } = useTranslation();

  const numericCode = event.checkin_code
    ? generateNumericCode(event.event_id, userId, event.checkin_code)
    : '';

  const qrCode = event.checkin_code
    ? generateQRCode(event.event_id, userId, event.checkin_code)
    : '';

  return (
    <div className="rounded-xl p-6 bg-white shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-900">
        {event.name}
      </h2>

      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{t('user.checkinStatus')}:</span>
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
          </span>
        </div>
      </div>

      {event.checkin_qr_enabled && event.checkin_code && userId && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold mb-3 text-center text-gray-700">
            {t('user.checkinQRCode')}
          </h3>
          <div className="flex justify-center p-5 bg-white rounded-xl border border-gray-200">
            <QRCodeSVG value={qrCode} size={200} level="H" />
          </div>
          <div className="mt-3 text-2xl font-mono text-center text-gray-900 font-bold tracking-widest py-1">
            {numericCode}
          </div>
        </div>
      )}

      {!event.checkin_qr_enabled && event.checkin_code && userId && (
        <div className="mt-2 text-2xl font-mono text-center text-gray-900 font-bold tracking-widest py-1">
          {numericCode}
        </div>
      )}
    </div>
  );
}
