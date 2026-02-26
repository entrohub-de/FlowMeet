'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  getUserConnections,
  getPendingConnections,
  createConnectionRequest,
  respondToConnection,
  toggleInterest,
  getEncounterHistory,
  type Connection,
  type Encounter,
} from '@/lib/api/connections';
import {
  getAllRecommendations,
  type Recommendation,
} from '@/lib/api/post-event-matching';
import { Users, Sparkles, UserPlus, Clock, Loader2 } from 'lucide-react';
import { UserAvatar } from '@/components/connections/UserAvatar';
import { ConnectionCard } from '@/components/connections/ConnectionCard';
import { ReceivedRequestCard } from '@/components/connections/ReceivedRequestCard';
import { ConnectionRecommendationCard } from '@/components/connections/ConnectionRecommendationCard';
import { EncounterHistory } from '@/components/connections/EncounterHistory';
import { CalendarDays } from 'lucide-react';

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [togglingInterest, setTogglingInterest] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const uid = session.user.id;

    try {
      const [conns, recs, pending, enc] = await Promise.all([
        getUserConnections(uid),
        getAllRecommendations(uid),
        getPendingConnections(uid),
        getEncounterHistory(uid),
      ]);
      setConnections(conns);
      setRecommendations(recs);
      setPendingRequests(pending);
      setEncounters(enc);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSendRequest = async (rec: Recommendation) => {
    setSendingTo(rec.userId);
    const result = await createConnectionRequest(rec.userId, rec.eventId);
    if (result) {
      setRecommendations((prev) => prev.filter((r) => r.userId !== rec.userId));
      setPendingRequests((prev) => [
        {
          user_id: rec.userId,
          nickname: rec.nickname,
          gender: rec.gender,
          age_group: rec.age_group,
          avatar_url: null,
          event_name: rec.eventName,
          event_id: rec.eventId,
          connection_id: result.connectionId,
          note: null,
          connected_at: new Date().toISOString(),
          status: 'pending',
          direction: 'sent',
          interested: false,
          mutual_interest: false,
        },
        ...prev,
      ]);
    }
    setSendingTo(null);
  };

  const handleRespond = async (req: Connection, accept: boolean) => {
    setRespondingTo(req.connection_id);
    const ok = await respondToConnection(req.connection_id, accept);
    if (ok) {
      setPendingRequests((prev) => prev.filter((r) => r.connection_id !== req.connection_id));
      if (accept) {
        setConnections((prev) => [
          { ...req, status: 'accepted', direction: null },
          ...prev,
        ]);
      }
    }
    setRespondingTo(null);
  };

  const handleToggleInterest = async (conn: Connection) => {
    setTogglingInterest(conn.connection_id);
    const newValue = !conn.interested;
    const ok = await toggleInterest(conn.connection_id, newValue);
    if (ok) {
      setConnections((prev) =>
        prev.map((c) =>
          c.connection_id === conn.connection_id
            ? { ...c, interested: newValue }
            : c
        )
      );
    }
    setTogglingInterest(null);
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
  const hasAnyData = connections.length > 0 || encounters.length > 0 || recommendations.length > 0 || pendingRequests.length > 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">
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
            <ReceivedRequestCard
              key={req.connection_id}
              request={req}
              responding={respondingTo === req.connection_id}
              onRespond={handleRespond}
            />
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
          {recommendations.map((rec) => (
            <ConnectionRecommendationCard
              key={`${rec.eventId}-${rec.userId}`}
              recommendation={rec}
              sending={sendingTo === rec.userId}
              onSendRequest={handleSendRequest}
            />
          ))}
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
            <div key={req.connection_id} className="bg-card border border-dashed border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <UserAvatar avatarUrl={req.avatar_url} name={req.nickname} variant="muted" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {req.nickname || t('user.anonymous')}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                    <CalendarDays className="w-3 h-3" />
                    <span>{req.event_name}</span>
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

      {/* Encounter history */}
      {encounters.length > 0 && <EncounterHistory encounters={encounters} />}

      {/* Existing connections */}
      <section className="space-y-3">
        {!hasAnyData ? (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('connections.empty')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('connections.emptyHint')}</p>
          </div>
        ) : connections.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('connections.totalCount', { count: connections.length })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('connections.interestHint')}
              </p>
            </div>
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.user_id}
                connection={conn}
                togglingInterest={togglingInterest === conn.connection_id}
                onToggleInterest={handleToggleInterest}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
