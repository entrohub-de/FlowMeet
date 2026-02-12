'use client';

import { Event } from '@/types/domain';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from '@/lib/i18n/context';

interface EventCheckinCardProps {
  event: Event;
  userId: string;
  isCheckedIn: boolean;
}

/**
 * 生成6位数字签到码（用于手动输入）
 */
function generateNumericCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  // 简单哈希函数
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // 生成6位数字（100000 - 999999）
  const code = Math.abs(hash) % 900000 + 100000;
  return code.toString();
}

/**
 * 生成QR码内容（包含完整信息的Base64）
 */
function generateQRCode(eventId: string, userId: string, checkinCode: string): string {
  const raw = `${eventId}/${userId}/${checkinCode}`;
  return btoa(raw);
}

export function EventCheckinCard({ event, userId, isCheckedIn }: EventCheckinCardProps) {
  const { t } = useTranslation();

  // 生成签到码
  const numericCode = event.checkin_code
    ? generateNumericCode(event.event_id, userId, event.checkin_code)
    : '';

  const qrCode = event.checkin_code
    ? generateQRCode(event.event_id, userId, event.checkin_code)
    : '';

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
      {event.checkin_qr_enabled && event.checkin_code && userId && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-center text-gray-700">
            {t('user.checkinQRCode')}
          </h3>
          <div className="flex justify-center p-5 bg-white rounded-xl shadow-inner border-3 border-gray-200">
            <QRCodeSVG
              value={qrCode}
              size={200}
              level="H"
            />
          </div>
          <p className="mt-2 text-xs text-center text-gray-500">
            扫描二维码即可签到
          </p>
        </div>
      )}

      {/* 签到码 */}
      {event.checkin_code && userId && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1 text-center">签到码</div>
          <div className="text-2xl font-mono text-center text-gray-700 font-bold tracking-widest py-2">
            {numericCode}
          </div>
          <p className="mt-2 text-xs text-center text-gray-400">
            向主办方出示此码完成签到
          </p>
        </div>
      )}
    </div>
  );
}
