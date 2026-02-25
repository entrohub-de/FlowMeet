'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getUserSignups, verifyPayment } from '@/lib/api/signup';
import { getProfile } from '@/lib/api/profile';
import { supabase } from '@/lib/supabase/client';
import type { Event, Profile } from '@/types/domain';
import EventCard from '@/components/event/EventCard';
import PastEventCard from '@/components/event/PastEventCard';
// Phase 1: ad banner hidden (A+C model simplification)
// import AdBanner from '@/components/ads/AdBanner';
import { CalendarCheck, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function EventPage() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [signupSet, setSignupSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [hostProfiles, setHostProfiles] = useState<Map<string, Pick<Profile, 'nickname' | 'avatar_url'>>>(new Map());

  // Track events that just got signed up (pending move to "my events")
  const [fadingOutIds, setFadingOutIds] = useState<Set<string>>(new Set());
  // Track events that just appeared in "my events" after delayed move
  const [justSignedUpIds, setJustSignedUpIds] = useState<Set<string>>(new Set());

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

        // Batch fetch host profiles for all events
        const hostIds = [...new Set(allEvents.map(e => e.created_by).filter(Boolean))] as string[];
        if (hostIds.length > 0) {
          const profileMap = new Map<string, Pick<Profile, 'nickname' | 'avatar_url'>>();
          const profiles = await Promise.all(hostIds.map(id => getProfile(id)));
          hostIds.forEach((id, i) => {
            if (profiles[i]) {
              profileMap.set(id, { nickname: profiles[i]!.nickname, avatar_url: profiles[i]!.avatar_url });
            }
          });
          setHostProfiles(profileMap);
        }
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Handle payment result from Stripe redirect
  useEffect(() => {
    const payment = searchParams.get('payment');
    const paidEventId = searchParams.get('event');

    if (payment === 'success') {
      toast.success(t('ux.toast.paymentSuccess'));

      // Verify payment and activate signup
      if (paidEventId) {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          if (!session?.user?.id) return;
          const verified = await verifyPayment(paidEventId, session.user.id);
          if (verified) {
            setSignupSet(prev => { const next = new Set(prev); next.add(paidEventId); return next; });
          }
        });
      }
    } else if (payment === 'cancelled') {
      toast.info(t('ux.toast.paymentCancelled'));
    }
  }, [searchParams, t]);

  const handleSignupChange = useCallback((eventId: string, signedUp: boolean) => {
    if (signedUp) {
      // Phase 1: Let user enjoy the success state (confetti, green check) for 800ms
      // Phase 2: Start fade-out animation
      setTimeout(() => {
        setFadingOutIds(prev => new Set(prev).add(eventId));
      }, 800);

      // Phase 3: After fade completes, move to "my events"
      setTimeout(() => {
        setSignupSet(prev => { const next = new Set(prev); next.add(eventId); return next; });
        setFadingOutIds(prev => { const next = new Set(prev); next.delete(eventId); return next; });
        setJustSignedUpIds(prev => new Set(prev).add(eventId));

        setTimeout(() => {
          setJustSignedUpIds(prev => { const next = new Set(prev); next.delete(eventId); return next; });
        }, 600);
      }, 800 + 700);
    } else {
      setSignupSet(prev => { const next = new Set(prev); next.delete(eventId); return next; });
    }
  }, []);

  const { myUpcoming, discoverEvents, myPast } = useMemo(() => {
    const now = new Date();
    const upcoming: Event[] = [];
    const discover: Event[] = [];
    const past: Event[] = [];

    events.forEach((ev) => {
      const isPast = new Date(ev.end_time) < now;
      const isSignedUp = signupSet.has(ev.event_id);

      if (isPast && isSignedUp) {
        past.push(ev);
      } else if (isSignedUp) {
        upcoming.push(ev);
      } else if (!isPast) {
        discover.push(ev);
      }
    });

    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return { myUpcoming: upcoming, discoverEvents: discover, myPast: past };
  }, [events, signupSet]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-[120px]" />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-muted/30 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-[120px]" />
        <div className="container mx-auto px-4 py-16 max-w-4xl text-center relative z-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CalendarCheck className="w-8 h-8 text-primary" />
          </div>
          <p className="text-lg font-medium text-foreground">{t('user.noEvents')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('user.noEventsDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 relative overflow-hidden">
      {/* Brand glow background */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.08] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-32 w-[400px] h-[400px] rounded-full bg-accent/[0.06] blur-[100px]" />

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-8 relative z-10">
        {/* Phase 1: ad banner hidden (A+C model simplification) */}
        {/* <AdBanner /> */}

        {/* My Upcoming Events */}
        <section className="space-y-3">
          <div className="flex items-center gap-3 px-1">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              {t('user.myEvents')}
              {myUpcoming.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {myUpcoming.length}
                </span>
              )}
            </h2>
          </div>

          {myUpcoming.length === 0 ? (
            <div className="bg-card/60 backdrop-blur-sm border border-dashed border-border rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t('user.noSignedUpEvents')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myUpcoming.map((event) => (
                <div
                  key={event.event_id}
                  className={justSignedUpIds.has(event.event_id) ? 'animate-slide-up-fade' : ''}
                >
                  <EventCard
                    event={event}
                    locale={locale}
                    t={t}
                    initialSignedUp
                    onSignupChange={handleSignupChange}
                    hostProfile={event.created_by ? hostProfiles.get(event.created_by) : undefined}
                    variant="signed-up"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Discover Events */}
        {discoverEvents.length > 0 && (
          <section id="discover" className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <h2 className="text-base font-semibold text-foreground">
                {t('user.discoverEvents')}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {discoverEvents.map((event) => (
                <EventCard
                  key={event.event_id}
                  event={event}
                  locale={locale}
                  t={t}
                  initialSignedUp={false}
                  onSignupChange={handleSignupChange}
                  hostProfile={event.created_by ? hostProfiles.get(event.created_by) : undefined}
                  fadingOut={fadingOutIds.has(event.event_id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Events (collapsible) */}
        {myPast.length > 0 && (
          <section className="space-y-3">
            <button
              onClick={() => setShowPast((prev) => !prev)}
              className="flex items-center gap-3 group px-1"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <History className="w-4 h-4 text-muted-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">{t('user.pastEvents')}</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {myPast.length}
              </span>
              {showPast ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showPast && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myPast.map((event) => (
                  <PastEventCard
                    key={event.event_id}
                    event={event}
                    locale={locale}
                    t={t}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
