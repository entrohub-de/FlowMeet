'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import Link from 'next/link';
import { CalendarDays, Users, ArrowRight, Play, Inbox, Search, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getProfile } from '@/lib/api/profile';
import { getUserSignedUpEvents } from '@/lib/api/signup';

import { getUserConnections } from '@/lib/api/connections';
import { getPendingRequests } from '@/lib/api/post-event-matching';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import type { Event, Profile } from '@/types/domain';
import type { Connection } from '@/lib/api/connections';
import type { PendingRequest } from '@/lib/api/post-event-matching';

export default function UserHomePage() {
  const { t } = useTranslation();
  const { flowState, activeStep, selectedEventId, events: flowEvents } = useActiveFlow();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        profileData,
        signedUpEvents,
        conns,
        pending,
      ] = await Promise.all([
        getProfile(user.id),
        getUserSignedUpEvents(user.id),
        getUserConnections(user.id),
        getPendingRequests(user.id),
      ]);

      setProfile(profileData);
      setConnections(conns);
      setPendingRequests(pending.filter(r => r.direction === 'received'));

      // Filter upcoming signed-up events (not passed)
      const now = new Date();
      const upcoming = signedUpEvents.filter(e => new Date(e.end_time) >= now);
      upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      setUpcomingEvents(upcoming);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const hasActiveFlow = flowState && flowState.flowStatus === 'running';
  const activeFlowEvent = flowEvents.find(e => e.event_id === selectedEventId);
  const receivedCount = pendingRequests.length;

  // Format event time
  const formatEventTime = (startTime: string) => {
    const date = new Date(startTime);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `${t('dashboard.today')} ${timeStr}`;
    if (isTomorrow) return `${t('dashboard.tomorrow')} ${timeStr}`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* 1. Greeting */}
        <div className="px-1">
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.nickname
              ? t('dashboard.greeting', { name: profile.nickname })
              : t('dashboard.greetingDefault')}
          </h1>
        </div>

        {/* 2. Active Flow Banner */}
        {hasActiveFlow && activeFlowEvent && (
          <Link
            href="/user/flow"
            className="block bg-primary/10 border border-primary/30 rounded-xl p-4 hover:bg-primary/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Play className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {t('dashboard.liveNow')}
                </p>
                <p className="text-sm text-foreground truncate">
                  {activeFlowEvent.name}
                  {activeStep && ` · ${activeStep.title}`}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
            </div>
          </Link>
        )}

        {/* 3. Pending Actions */}
        {receivedCount > 0 && (
          <Link
            href="/user/connections"
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Inbox className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="flex-1 text-sm text-foreground">
              {t('dashboard.pendingConnections', { count: receivedCount })}
            </p>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        )}

        {/* 4. My Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-semibold text-foreground">
              {t('dashboard.myUpcoming')}
            </h2>
            <Link href="/user/event" className="text-xs text-primary hover:underline">
              {t('dashboard.viewAll')}
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {t('dashboard.noUpcomingEvents')}
              </p>
              <Link
                href="/user/event"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Search className="w-3.5 h-3.5" />
                {t('dashboard.goDiscover')}
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map(event => (
                <Link
                  key={event.event_id}
                  href="/user/flow"
                  className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.name}
                    </p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatEventTime(event.start_time)}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
