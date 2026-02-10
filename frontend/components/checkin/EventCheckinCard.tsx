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
    <div className="relative rounded-xl p-6 bg-gradient-to-br from-white to-gray-50 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-gray-300">
      {/* 装饰性渐变边框 */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 -z-10" />

      <h2 className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {event.name}
      </h2>

      {/* 签到状态 */}
      <div className="mb-6 pb-4 border-b-2 border-gray-300">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">{t('user.checkinStatus')}:</span>
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-md ${
              isCheckedIn
                ? 'bg-gradient-to-r from-green-400 to-green-500 text-white'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700'
            }`}
          >
            {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
          </span>
        </div>
      </div>

      {/* 二维码 */}
      {event.checkin_qr_enabled && event.checkin_code && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-center text-gray-700">
            {t('user.checkinQRCode')}
          </h3>
          <div className="flex justify-center p-5 bg-white rounded-xl shadow-inner border-3 border-gray-200">
            <QRCodeSVG
              value={`${window.location.origin}/checkin/${event.event_id}/${event.checkin_code}`}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>
      )}

      {/* 短码 */}
      {event.checkin_code && (
        <div className="mt-4 text-center">
          <span className="text-xs font-mono text-gray-400">
            {event.checkin_code}
          </span>
        </div>
      )}
    </div>
  );
}
