'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getUserSignups } from '@/lib/api/signup';
import { supabase } from '@/lib/supabase/client';
import type { Event } from '@/types/domain';
import EventCard from '@/components/event/EventCard';
import { CalendarCheck, Search } from 'lucide-react';

export default function EventPage() {
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [signupSet, setSignupSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [allEvents, session] = await Promise.all([
          getEvents(),
          supabase.auth.getSession().then((r) => r.data.session),
        ]);
        setEvents(allEvents);

        if (session?.user?.id) {
          const signupMap = await getUserSignups(session.user.id);
          setSignupSet(new Set(signupMap.keys()));
        }
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSignupChange = useCallback((eventId: string, signedUp: boolean) => {
    setSignupSet((prev) => {
      const next = new Set(prev);
      if (signedUp) {
        next.add(eventId);
      } else {
        next.delete(eventId);
      }
      return next;
    });
  }, []);

  const { myEvents, availableEvents } = useMemo(() => {
    const my: Event[] = [];
    const available: Event[] = [];
    events.forEach((ev) => {
      if (signupSet.has(ev.event_id)) {
        my.push(ev);
      } else {
        available.push(ev);
      }
    });
    return { myEvents: my, availableEvents: available };
  }, [events, signupSet]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center py-16">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center py-16 space-y-2">
        <p className="text-lg font-medium text-foreground">{t('user.noEvents')}</p>
        <p className="text-sm text-muted-foreground">{t('user.noEventsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8">
      {/* My Events */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t('user.myEvents')}</h2>
          {myEvents.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {myEvents.length}
            </span>
          )}
        </div>

        {myEvents.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">{t('user.noSignedUpEvents')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myEvents.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                locale={locale}
                t={t}
                initialSignedUp
                onSignupChange={handleSignupChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* Available Events */}
      {availableEvents.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t('user.discoverEvents')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableEvents.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                locale={locale}
                t={t}
                initialSignedUp={false}
                onSignupChange={handleSignupChange}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
