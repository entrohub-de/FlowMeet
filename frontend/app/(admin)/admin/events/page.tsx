'use client';

import { useEffect, useState, useCallback } from 'react';
import { CalendarDays, Users, Star, Loader2, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getAdminEventsList, type AdminEventSummary } from '@/lib/api/admin';
import Link from 'next/link';

type StatusFilter = 'all' | 'active' | 'passed' | 'cancelled';

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminEventsPage() {
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<AdminEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminEventsList();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const statusStyle = (s: string) => {
    switch (s) {
      case 'active': return 'bg-green-50 text-green-700';
      case 'passed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t('admin.events.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('admin.events.description')}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {(['all', 'active', 'passed', 'cancelled'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {t(`admin.events.filter.${f}`)}
            </button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {t('admin.events.totalCount', { count: filtered.length })}
          </span>
        </div>

        {/* Event list */}
        {loading ? (
          <div className="p-12 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            {t('common.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {t('admin.events.noEvents')}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ev) => (
              <Link
                key={ev.event_id}
                href={`/admin/events/${ev.event_id}`}
                className="block bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center gap-4">
                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{ev.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyle(ev.status)}`}>
                        {t(`host.event.status.${ev.status}`)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.start_time, locale)} — {formatDate(ev.end_time, locale)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <div className="text-center min-w-[60px]">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {ev.signup_count}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('admin.events.signups')}</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                        <Users className="w-3.5 h-3.5 text-green-600" />
                        {ev.checkin_count}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t('admin.events.checkins')}</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-foreground">
                        <Star className="w-3.5 h-3.5 text-yellow-500" />
                        {ev.avg_rating ?? '—'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {ev.rating_count > 0
                          ? t('admin.events.ratingCount', { count: ev.rating_count })
                          : t('admin.events.noRatings')}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>

                {/* Mobile stats */}
                <div className="flex sm:hidden gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{t('admin.events.signups')}: {ev.signup_count}</span>
                  <span>{t('admin.events.checkins')}: {ev.checkin_count}</span>
                  <span>{t('admin.events.avgRating')}: {ev.avg_rating ?? '—'} ({ev.rating_count})</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
