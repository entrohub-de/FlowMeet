'use client';

import { Event } from '@/types/domain';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/lib/i18n/context';

interface EventCheckinCardProps {
  event: Event;
  isCheckedIn: boolean;
}

export function EventCheckinCard({ event, isCheckedIn }: EventCheckinCardProps) {
  const { t } = useTranslation();

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-xl font-semibold mb-4">{event.name}</h2>

      {/* 签到状态 */}
      <div className="mb-4 pb-4 border-b">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t('user.checkinStatus')}:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCheckedIn
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
          </span>
        </div>
      </div>

      {/* 二维码 */}
      {event.checkin_qr_enabled && event.checkin_code && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-3 text-center">
            {t('user.checkinQRCode')}
          </h3>
          <div className="flex justify-center p-4 bg-white border rounded-lg">
            <QRCodeSVG
              value={`${window.location.origin}/checkin/${event.event_id}/${event.checkin_code}`}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {t('user.scanQRCode')}
          </p>
        </div>
      )}

      {/* 短码 */}
      {event.checkin_code && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2 text-center">
            {t('user.checkinShortCode')}
          </h3>
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="text-center">
              <span className="text-3xl font-bold tracking-wider font-mono">
                {event.checkin_code}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {t('user.enterShortCode')}
          </p>
        </div>
      )}
    </div>
  );
}
