'use client';

import { useState } from 'react';
import { Calendar, MapPin, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { EventCheckinCard } from '@/components/checkin/EventCheckinCard';
import type { Event } from '@/types/domain';

interface CheckinCardWalletProps {
  events: Event[];
  userId: string;
  checkedInMap: Map<string, boolean>;
}

function formatDateShort(startStr: string, locale: string): string {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
  const start = new Date(startStr);
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${start.toLocaleDateString(loc, dateOpts)}  ${start.toLocaleTimeString(loc, timeOpts)}`;
}

/** 非活动卡片的 peek 区域高度 */
const PEEK_HEIGHT = 64;

export default function CheckinCardWallet({ events, userId, checkedInMap }: CheckinCardWalletProps) {
  const { t, locale } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  if (events.length === 0) return null;

  if (events.length === 1) {
    return (
      <EventCheckinCard
        event={events[0]}
        userId={userId}
        isCheckedIn={checkedInMap.get(events[0].event_id) || false}
      />
    );
  }

  // 分成三部分：活动卡片上方的 peek 卡片、活动卡片、下方的 peek 卡片
  const aboveCards = events.slice(0, activeIndex);
  const activeEvent = events[activeIndex];
  const belowCards = events.slice(activeIndex + 1);

  return (
    <div className="relative" style={{ perspective: '1200px' }}>
      {/* 上方堆叠卡片 */}
      {aboveCards.map((evt, i) => {
        const distFromActive = activeIndex - i;
        const isCheckedIn = checkedInMap.get(evt.event_id) || false;
        const location = evt.venue?.name || t('user.locationTbd');

        return (
          <button
            key={evt.event_id}
            onClick={() => setActiveIndex(i)}
            className="w-full text-left rounded-xl border border-gray-200 cursor-pointer overflow-hidden transition-all duration-300 ease-out"
            style={{
              zIndex: events.length - distFromActive,
              transform: `scale(${1 - distFromActive * 0.03})`,
              transformOrigin: 'top center',
              background: `linear-gradient(180deg, #ffffff ${60}%, #f8f8f8 100%)`,
              boxShadow: `0 ${2 + distFromActive}px ${8 + distFromActive * 4}px rgba(0,0,0,${0.06 + distFromActive * 0.02})`,
              marginBottom: -PEEK_HEIGHT + 16,
              position: 'relative',
            }}
          >
            <div className="px-5 py-3.5" style={{ minHeight: PEEK_HEIGHT }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {evt.name}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateShort(evt.start_time, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </span>
              </div>
            </div>
          </button>
        );
      })}

      {/* 活动卡片（展开状态） */}
      <div
        className="relative transition-all duration-300 ease-out"
        style={{
          zIndex: events.length + 1,
          transform: 'scale(1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          borderRadius: '0.75rem',
        }}
      >
        <EventCheckinCard
          event={activeEvent}
          userId={userId}
          isCheckedIn={checkedInMap.get(activeEvent.event_id) || false}
        />
      </div>

      {/* 下方堆叠卡片 */}
      {belowCards.map((evt, i) => {
        const distFromActive = i + 1;
        const isCheckedIn = checkedInMap.get(evt.event_id) || false;
        const location = evt.venue?.name || t('user.locationTbd');

        return (
          <button
            key={evt.event_id}
            onClick={() => setActiveIndex(activeIndex + i + 1)}
            className="w-full text-left rounded-xl border border-gray-200 cursor-pointer overflow-hidden transition-all duration-300 ease-out"
            style={{
              zIndex: events.length - distFromActive,
              transform: `scale(${1 - distFromActive * 0.03})`,
              transformOrigin: 'bottom center',
              background: `linear-gradient(0deg, #ffffff ${60}%, #f8f8f8 100%)`,
              boxShadow: `0 ${-1 - distFromActive}px ${8 + distFromActive * 4}px rgba(0,0,0,${0.04 + distFromActive * 0.02})`,
              marginTop: i === 0 ? -4 : 4,
              position: 'relative',
            }}
          >
            <div className="px-5 py-3.5" style={{ minHeight: PEEK_HEIGHT }}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {evt.name}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCheckedIn ? t('user.checkedIn') : t('user.notCheckedIn')}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateShort(evt.start_time, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {location}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
