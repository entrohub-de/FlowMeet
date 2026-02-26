'use client';

import { useTranslation } from '@/lib/i18n/context';
import { type Connection } from '@/lib/api/connections';
import { CalendarDays, Loader2, Heart } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ConnectionCardProps {
  connection: Connection;
  togglingInterest: boolean;
  onToggleInterest: (conn: Connection) => void;
}

export function ConnectionCard({ connection: conn, togglingInterest, onToggleInterest }: ConnectionCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`bg-card border rounded-xl p-4 space-y-2 ${
        conn.mutual_interest
          ? 'border-pink-400/50 bg-pink-50/30 dark:bg-pink-950/10'
          : 'border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={conn.avatar_url} name={conn.nickname} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {conn.nickname || t('user.anonymous')}
            </h3>
            {conn.mutual_interest && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 rounded-full">
                <Heart className="w-3 h-3 fill-current" />
                {t('connections.mutualInterest')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <CalendarDays className="w-3 h-3" />
            <span>{conn.event_name}</span>
          </div>
        </div>

        <button
          onClick={() => onToggleInterest(conn)}
          disabled={togglingInterest}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 touch-feedback ${
            conn.interested
              ? 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          title={conn.interested ? t('connections.notInterested') : t('connections.interested')}
        >
          {togglingInterest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Heart className={`w-4 h-4 ${conn.interested ? 'fill-current' : ''}`} />
          )}
          {conn.interested ? t('connections.interested') : t('connections.notInterested')}
        </button>
      </div>

      <div className="text-xs text-muted-foreground">
        {t('connections.connectedAt', {
          time: new Date(conn.connected_at).toLocaleDateString(),
        })}
      </div>
    </div>
  );
}
