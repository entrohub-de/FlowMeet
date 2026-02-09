'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Event } from '@/types/domain';

interface EventSelectorProps {
  events: Event[];
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
}

export function EventSelector({
  events,
  selectedEventId,
  onEventChange,
}: EventSelectorProps) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('user.noEvents')}</p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <label className="block text-sm font-medium mb-2">
        {t('user.selectEvent')}
      </label>
      <select
        value={selectedEventId}
        onChange={(e) => onEventChange(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {events.map((event) => (
          <option key={event.event_id} value={event.event_id}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  );
}
