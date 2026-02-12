'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useCheckinData } from '@/hooks/useCheckinData';
import { EventCheckinCard } from '@/components/checkin/EventCheckinCard';
import { Event } from '@/types/domain';

function isToday(dateString: string): boolean {
  const eventDate = new Date(dateString);
  const today = new Date();
  return (
    eventDate.getFullYear() === today.getFullYear() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getDate() === today.getDate()
  );
}

export default function CheckinPage() {
  const { t } = useTranslation();
  const { events, loading, checkedInEvents, userId, error } = useCheckinData();
  const [showOtherEvents, setShowOtherEvents] = useState(false);

  const { todayEvents, otherEvents } = useMemo(() => {
    const today: Event[] = [];
    const other: Event[] = [];

    events.forEach((event) => {
      if (isToday(event.start_time)) {
        today.push(event);
      } else {
        other.push(event);
      }
    });

    return { todayEvents: today, otherEvents: other };
  }, [events]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">{t('common.error')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('user.noEvents')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {todayEvents.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">{t('user.todayEvents')}</h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {todayEvents.map((event) => (
                  <EventCheckinCard
                    key={event.event_id}
                    event={event}
                    userId={userId || ''}
                    isCheckedIn={checkedInEvents.get(event.event_id) || false}
                  />
                ))}
              </div>
            </div>
          )}

          {otherEvents.length > 0 && (
            <div>
              <button
                onClick={() => setShowOtherEvents(!showOtherEvents)}
                className="flex items-center gap-2 text-lg font-semibold text-gray-700 hover:text-gray-900 mb-4 px-button h-button"
              >
                <span>{showOtherEvents ? '▼' : '▶'}</span>
                <span>{t('user.otherEvents')} ({otherEvents.length})</span>
              </button>

              {showOtherEvents && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {otherEvents.map((event) => (
                    <EventCheckinCard
                      key={event.event_id}
                      event={event}
                      userId={userId || ''}
                      isCheckedIn={checkedInEvents.get(event.event_id) || false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
