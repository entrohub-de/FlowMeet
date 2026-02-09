'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useCheckinData } from '@/hooks/useCheckinData';
import { EventCheckinCard } from '@/components/checkin/EventCheckinCard';

export default function CheckinPage() {
  const { t } = useTranslation();
  const { events, loading, checkedInEvents, error } = useCheckinData();

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
      <h1 className="text-3xl font-bold mb-4">{t('user.checkin')}</h1>
      <p className="text-gray-600 mb-8">
        {t('user.checkinPage')}
      </p>

      {events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('user.noEvents')}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCheckinCard
              key={event.event_id}
              event={event}
              isCheckedIn={checkedInEvents.get(event.event_id) || false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
