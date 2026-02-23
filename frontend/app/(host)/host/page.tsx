'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/features/auth/useAuth';
import { getProfile } from '@/lib/api/profile';
import { getHostDashboardData, type HostEventSummary } from '@/lib/api/events';
import Link from 'next/link';
import {
  Plus,
  ClipboardCheck,
  Play,
  CalendarDays,
  Users,
  Star,
  CalendarClock,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTimeUntil(dateStr: string, locale: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return '';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return locale === 'zh' ? `${days} 天` : `${days}d`;
  }
  if (hours > 0) {
    return locale === 'zh' ? `${hours} 小时 ${minutes} 分钟` : `${hours}h ${minutes}m`;
  }
  return locale === 'zh' ? `${minutes} 分钟` : `${minutes}m`;
}

function getEventDisplayStatus(event: HostEventSummary): 'upcoming' | 'ongoing' | 'passed' | 'cancelled' {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'passed') return 'passed';
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'passed';
}

export default function HostDashboardPage() {
  const { t, locale } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const [nickname, setNickname] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    events: HostEventSummary[];
    totals: { totalEvents: number; totalParticipants: number; avgRating: number | null; thisMonthEvents: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [profile, data] = await Promise.all([
        getProfile(userId),
        getHostDashboardData(),
      ]);
      setNickname(profile?.nickname ?? null);
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadData(user.id);
  }, [user?.id, loadData]);

  const nextEvent = useMemo(() => {
    if (!dashboardData) return null;
    // Events are sorted by start_time desc, so reverse to find the nearest upcoming/ongoing
    const sorted = [...dashboardData.events].reverse();
    return sorted.find((e) => {
      const status = getEventDisplayStatus(e);
      return status === 'ongoing' || status === 'upcoming';
    }) ?? null;
  }, [dashboardData]);

  const nextEventStatus = nextEvent ? getEventDisplayStatus(nextEvent) : null;

  const recentEvents = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.events.slice(0, 5);
  }, [dashboardData]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totals = dashboardData?.totals;

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto space-y-6">
        {/* Welcome + Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              {nickname
                ? t('host.dashboard.welcome', { name: nickname })
                : t('host.dashboard.welcomeDefault')}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/host/event"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('host.dashboard.createEvent')}
            </Link>
<Link
              href="/host/live/flow"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              <Play className="w-4 h-4" />
              {t('host.dashboard.flowControl')}
            </Link>
          </div>
        </div>

        {/* Next Event Highlight */}
        {nextEvent ? (
          <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    nextEventStatus === 'ongoing'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {nextEventStatus === 'ongoing'
                      ? t('host.dashboard.ongoing')
                      : t('host.dashboard.upcomingEvent')}
                  </span>
                  {nextEventStatus === 'upcoming' && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {t('host.dashboard.startsIn', { time: getTimeUntil(nextEvent.start_time, locale) })}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground">{nextEvent.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {formatDate(nextEvent.start_time, locale)}
                  {nextEvent.venue?.name && ` · ${nextEvent.venue.name}`}
                </p>
                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {t('host.dashboard.signups')}: {nextEvent.signup_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardCheck className="w-3.5 h-3.5 text-green-600" />
                    {t('host.dashboard.checkins')}: {nextEvent.checkin_count}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 p-8 text-center">
            <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t('host.dashboard.noUpcoming')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('host.dashboard.noUpcomingHint')}</p>
          </div>
        )}

        {/* Stats Cards */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs">{t('host.dashboard.totalEvents')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{totals.totalEvents}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs">{t('host.dashboard.totalParticipants')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{totals.totalParticipants}</div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Star className="w-4 h-4" />
                <span className="text-xs">{t('host.dashboard.avgRating')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {totals.avgRating !== null ? totals.avgRating : t('host.dashboard.noRating')}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <CalendarClock className="w-4 h-4" />
                <span className="text-xs">{t('host.dashboard.thisMonth')}</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{totals.thisMonthEvents}</div>
            </div>
          </div>
        )}

        {/* Recent Events */}
        {recentEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">{t('host.dashboard.recentEvents')}</h2>
              <Link
                href="/host/event"
                className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                {t('host.dashboard.viewAll')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentEvents.map((ev) => {
                const status = getEventDisplayStatus(ev);
                const statusStyle = {
                  upcoming: 'bg-blue-50 text-blue-700',
                  ongoing: 'bg-green-50 text-green-700',
                  passed: 'bg-gray-100 text-gray-600',
                  cancelled: 'bg-red-50 text-red-600',
                }[status];
                return (
                  <Link
                    key={ev.event_id}
                    href={`/host/event/${ev.event_id}`}
                    className="block bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">{ev.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyle}`}>
                            {t(`host.events.status.${status}`)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(ev.start_time, locale)}
                          {ev.venue?.name && ` · ${ev.venue.name}`}
                        </p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <div className="text-center min-w-[50px]">
                          <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {ev.signup_count}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{t('host.dashboard.signups')}</div>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                            <Star className="w-3.5 h-3.5 text-yellow-500" />
                            {ev.avg_rating ?? '—'}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{t('host.dashboard.avgRating')}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>
                    {/* Mobile stats */}
                    <div className="flex sm:hidden gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{t('host.dashboard.signups')}: {ev.signup_count}</span>
                      <span>{t('host.dashboard.checkins')}: {ev.checkin_count}</span>
                      <span>{t('host.dashboard.avgRating')}: {ev.avg_rating ?? '—'}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
