'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import HostEventCard from '@/components/event/HostEventCard';
import CreateEventDialog from '@/components/event/CreateEventDialog';
import { Plus, ChevronDown, Archive } from 'lucide-react';

export default function HostEventPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();

      // Sort events by start time (earliest first)
      const sortedEvents = data.sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();
        return timeA - timeB;
      });

      setEvents(sortedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const { activeEvents, archivedEvents } = useMemo(() => {
    const active: Event[] = [];
    const archived: Event[] = [];
    for (const event of events) {
      if (event.status === 'passed' || event.status === 'cancelled') {
        archived.push(event);
      } else {
        active.push(event);
      }
    }
    return { activeEvents: active, archivedEvents: archived };
  }, [events]);

  const handleEventCreated = () => {
    setShowCreateDialog(false);
    loadEvents();
  };

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
              {t('host.events.title')}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('host.events.description')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            {t('host.events.createEvent')}
          </button>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {t('host.events.noEvents')}
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              {t('host.events.createFirstEvent')}
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Events */}
            {activeEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeEvents.map((event) => (
                  <HostEventCard
                    key={event.event_id}
                    event={event}
                    onUpdate={loadEvents}
                  />
                ))}
              </div>
            ) : archivedEvents.length > 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {t('host.events.noActiveEvents')}
                </p>
              </div>
            ) : null}

            {/* Archived Events (passed / cancelled) */}
            {archivedEvents.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPastEvents(!showPastEvents)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <Archive className="w-4 h-4" />
                  {t('host.events.archivedEvents', { count: archivedEvents.length })}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showPastEvents ? 'rotate-180' : ''}`} />
                </button>
                {showPastEvents && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {archivedEvents.map((event) => (
                      <HostEventCard
                        key={event.event_id}
                        event={event}
                        onUpdate={loadEvents}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      {showCreateDialog && (
        <CreateEventDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={handleEventCreated}
        />
      )}
    </div>
  );
}
