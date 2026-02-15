'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getUserConnections, type Connection } from '@/lib/api/connections';
import {
  getAllRecommendations,
  getPendingRequests,
  sendConnectionRequest,
  respondToConnectionRequest,
  type Recommendation,
  type PendingRequest,
} from '@/lib/api/post-event-matching';
import { getMatchLevel } from '@/lib/api/matching-algorithm';
import {
  Users, CalendarDays, User, Sparkles, UserPlus, Check, X,
  Send, Clock, Loader2,
} from 'lucide-react';

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;

    try {
      const [conns, recs, pending] = await Promise.all([
        getUserConnections(uid),
        getAllRecommendations(uid),
        getPendingRequests(uid),
      ]);
      setConnections(conns);
      setRecommendations(recs);
      setPendingRequests(pending);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSendRequest = async (rec: Recommendation) => {
    setSendingTo(rec.userId);
    const result = await sendConnectionRequest(rec.eventId, rec.userId);
    if (result) {
      // Remove from recommendations, add to pending
      setRecommendations((prev) => prev.filter((r) => r.userId !== rec.userId));
      setPendingRequests((prev) => [
        {
          matchId: result.matchId,
          eventId: rec.eventId,
          eventName: rec.eventName,
          partnerId: rec.userId,
          nickname: rec.nickname,
          gender: rec.gender,
          age_group: rec.age_group,
          direction: 'sent',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setSendingTo(null);
  };

  const handleRespond = async (req: PendingRequest, accept: boolean) => {
    setRespondingTo(req.matchId);
    const ok = await respondToConnectionRequest(req.matchId, accept);
    if (ok) {
      setPendingRequests((prev) => prev.filter((r) => r.matchId !== req.matchId));
      if (accept) {
        // Add to connections
        setConnections((prev) => [
          {
            user_id: req.partnerId,
            nickname: req.nickname,
            gender: req.gender,
            age_group: req.age_group,
            event_name: req.eventName,
            event_id: req.eventId,
            match_id: req.matchId,
            matched_at: req.createdAt,
          },
          ...prev,
        ]);
      }
    }
    setRespondingTo(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  const receivedRequests = pendingRequests.filter((r) => r.direction === 'received');
  const sentRequests = pendingRequests.filter((r) => r.direction === 'sent');

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('connections.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('connections.description')}</p>
      </div>

      {/* Received connection requests */}
      {receivedRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-primary" />
            {t('connections.receivedRequests')}
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 ml-1">
              {receivedRequests.length}
            </span>
          </h2>

          {receivedRequests.map((req) => (
            <div
              key={req.matchId}
              className="bg-card border border-primary/20 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {req.nickname || t('user.anonymous')}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <CalendarDays className="w-3 h-3" />
                    <span>{req.eventName}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRespond(req, true)}
                  disabled={respondingTo === req.matchId}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {respondingTo === req.matchId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t('connections.accept')}
                </button>
                <button
                  onClick={() => handleRespond(req, false)}
                  disabled={respondingTo === req.matchId}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  {t('connections.decline')}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            {t('connections.recommendations')}
          </h2>
          <p className="text-xs text-muted-foreground">{t('connections.recommendationsHint')}</p>

          {recommendations.map((rec) => {
            const level = getMatchLevel(rec.score);
            return (
              <div
                key={`${rec.eventId}-${rec.userId}`}
                className="bg-card border border-border rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {rec.nickname || t('user.anonymous')}
                      </h3>
                      <span className={`text-xs font-medium ${level.color}`}>
                        {rec.score}{t('connections.matchScore')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      <span>{rec.eventName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendRequest(rec)}
                    disabled={sendingTo === rec.userId}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {sendingTo === rec.userId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {t('connections.connect')}
                  </button>
                </div>

                {rec.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {rec.reasons.map((reason, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Sent requests (pending) */}
      {sentRequests.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {t('connections.sentRequests')}
          </h2>

          {sentRequests.map((req) => (
            <div
              key={req.matchId}
              className="bg-card border border-dashed border-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {req.nickname || t('user.anonymous')}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <CalendarDays className="w-3 h-3" />
                    <span>{req.eventName}</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                  {t('connections.pending')}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Existing connections */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-4 h-4 text-green-500" />
          {t('connections.myConnections')}
        </h2>

        {connections.length === 0 ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('connections.empty')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('connections.emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('connections.totalCount', { count: connections.length })}
            </p>

            {connections.map((conn) => (
              <div
                key={conn.user_id}
                className="bg-card border border-border rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {conn.nickname || t('user.anonymous')}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      <span>{conn.event_name}</span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  {t('connections.connectedAt', {
                    time: new Date(conn.matched_at).toLocaleDateString(),
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
