'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Star, MessageSquare, History, Users, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { getEvent } from '@/lib/api/events';
import {
  getAdminEventRatings,
  getAdminMatchQualityRatings,
  getAdminHostActions,
  type AdminEventRating,
  type AdminMatchQualityRating,
} from '@/lib/api/admin';
import type { Event, HostAction } from '@/types/domain';

type Tab = 'feedback' | 'actions';

function Stars({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < score ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`}
        />
      ))}
    </div>
  );
}

export default function AdminEventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { t, locale } = useTranslation();

  const [event, setEvent] = useState<Event | null>(null);
  const [tab, setTab] = useState<Tab>('feedback');
  const [loading, setLoading] = useState(true);

  // Feedback data
  const [eventRatings, setEventRatings] = useState<AdminEventRating[]>([]);
  const [qualityRatings, setQualityRatings] = useState<AdminMatchQualityRating[]>([]);

  // Actions data
  const [hostActions, setHostActions] = useState<(HostAction & { host_nickname: string | null })[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, ratings, quality, actions] = await Promise.all([
        getEvent(eventId),
        getAdminEventRatings(eventId),
        getAdminMatchQualityRatings(eventId),
        getAdminHostActions(eventId),
      ]);
      setEvent(ev);
      setEventRatings(ratings);
      setQualityRatings(quality);
      setHostActions(actions);
    } catch (err) {
      console.error('Failed to load event detail:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  const formatTime = (d: string) =>
    new Date(d).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const avgEventRating = eventRatings.length > 0
    ? Math.round((eventRatings.reduce((s, r) => s + r.overall_score, 0) / eventRatings.length) * 10) / 10
    : null;

  const avgQualityRating = qualityRatings.length > 0
    ? Math.round((qualityRatings.reduce((s, r) => s + r.score, 0) / qualityRatings.length) * 10) / 10
    : null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center text-muted-foreground">
        {t('host.event.notFound')}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Back + Event header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/events" className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">{event.name}</h1>
            <p className="text-xs text-muted-foreground">
              {formatTime(event.start_time)} — {formatTime(event.end_time)}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{eventRatings.length}</div>
            <div className="text-xs text-muted-foreground">{t('admin.eventDetail.eventRatings')}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{avgEventRating ?? '—'}</div>
            <div className="text-xs text-muted-foreground">{t('admin.eventDetail.avgScore')}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{qualityRatings.length}</div>
            <div className="text-xs text-muted-foreground">{t('admin.eventDetail.matchQualityRatings')}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{hostActions.length}</div>
            <div className="text-xs text-muted-foreground">{t('admin.eventDetail.hostActions')}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setTab('feedback')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'feedback' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            {t('admin.eventDetail.feedbackTab')}
          </button>
          <button
            onClick={() => setTab('actions')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'actions' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4" />
            {t('admin.eventDetail.actionsTab')}
          </button>
        </div>

        {/* Tab content */}
        {tab === 'feedback' && (
          <div className="space-y-4">
            {/* Event ratings */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Star className="w-4 h-4 text-yellow-500" />
                {t('admin.eventDetail.eventRatings')}
                {avgEventRating && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({t('admin.eventDetail.avg')}: {avgEventRating}/5)
                  </span>
                )}
              </h2>

              {eventRatings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('admin.eventDetail.noRatings')}</p>
              ) : (
                <div className="space-y-2">
                  {eventRatings.map((r) => (
                    <div key={r.rating_id} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {r.nickname || r.user_id.slice(0, 8)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTime(r.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-4 mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">{t('admin.eventDetail.overall')}:</span>
                          <Stars score={r.overall_score} />
                        </div>
                        {r.organization_score && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{t('admin.eventDetail.organization')}:</span>
                            <Stars score={r.organization_score} />
                          </div>
                        )}
                        {r.venue_score && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{t('admin.eventDetail.venue')}:</span>
                            <Stars score={r.venue_score} />
                          </div>
                        )}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted/30 rounded-lg p-2">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Match quality ratings */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Star className="w-4 h-4 text-blue-500" />
                {t('admin.eventDetail.matchQualityRatings')}
                {avgQualityRating && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({t('admin.eventDetail.avg')}: {avgQualityRating}/5)
                  </span>
                )}
              </h2>

              {qualityRatings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('admin.eventDetail.noRatings')}</p>
              ) : (
                <div className="space-y-2">
                  {qualityRatings.map((r) => (
                    <div key={r.rating_id} className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">
                            {r.nickname || r.user_id.slice(0, 8)}
                          </span>
                          <Stars score={r.score} />
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTime(r.created_at)}</span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted/30 rounded-lg p-2">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'actions' && (
          <div className="space-y-2">
            {hostActions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">{t('admin.eventDetail.noActions')}</p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

                {hostActions.map((action, i) => (
                  <div key={action.action_id} className="relative flex gap-3 pb-4">
                    {/* Timeline dot */}
                    <div className={`w-[10px] h-[10px] rounded-full mt-1.5 shrink-0 z-10 ring-2 ring-card ${
                      i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                      style={{ marginLeft: '14px' }}
                    />

                    <div className="flex-1 bg-card border border-border rounded-xl p-3 ml-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {t(`hostActions.actionTypes.${action.action_type}`)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(action.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('admin.eventDetail.byHost')}: {action.host_nickname || action.host_user_id.slice(0, 8)}
                      </div>
                      {action.metadata && Object.keys(action.metadata).length > 0 && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            {t('admin.eventDetail.metadata')}
                          </summary>
                          <pre className="text-xs text-muted-foreground mt-1 bg-muted/30 rounded p-2 overflow-x-auto">
                            {JSON.stringify(action.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
