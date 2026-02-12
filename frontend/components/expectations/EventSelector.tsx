'use client';

import { useTranslation } from '@/lib/i18n/context';
import CustomSelect from '@/components/ui/CustomSelect';
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
      <CustomSelect
        options={events.map((event) => ({
          value: event.event_id,
          label: event.name,
        }))}
        value={selectedEventId}
        onChange={onEventChange}
        placeholder={t('user.selectEvent')}
      />
    </div>
  );
}
