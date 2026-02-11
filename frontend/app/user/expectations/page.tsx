'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useExpectations } from '@/hooks/useExpectations';
import {
  EventSelector,
  ExpectationForm,
} from '@/components/expectations';

export default function ExpectationsPage() {
  const { t } = useTranslation();
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    myExpectation,
    userId,
    loading,
    submitting,
    error,
    submitExpectation,
  } = useExpectations();

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">{t('user.expectations')}</h1>
      <p className="text-gray-600 mb-8">{t('user.expectationsPage')}</p>

      <EventSelector
        events={events}
        selectedEventId={selectedEventId}
        onEventChange={setSelectedEventId}
      />

      {selectedEventId && userId && (
        <ExpectationForm
          initialValue={myExpectation}
          onSubmit={submitExpectation}
          submitting={submitting}
        />
      )}
    </div>
  );
}
