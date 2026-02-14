'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getUserConnections, type Connection } from '@/lib/api/connections';
import { Users, CalendarDays, User } from 'lucide-react';

export default function ConnectionsPage() {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      try {
        const data = await getUserConnections(session.user.id);
        setConnections(data);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('connections.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('connections.description')}</p>
      </div>

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
    </div>
  );
}
