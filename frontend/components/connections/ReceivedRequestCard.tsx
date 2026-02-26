'use client';

import { useTranslation } from '@/lib/i18n/context';
import { type Connection } from '@/lib/api/connections';
import { CalendarDays, Check, X, Loader2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ReceivedRequestCardProps {
  request: Connection;
  responding: boolean;
  onRespond: (req: Connection, accept: boolean) => void;
}

export function ReceivedRequestCard({ request: req, responding, onRespond }: ReceivedRequestCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={req.avatar_url} name={req.nickname} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {req.nickname || t('user.anonymous')}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <CalendarDays className="w-3 h-3" />
            <span>{req.event_name}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onRespond(req, true)}
          disabled={responding}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t('connections.accept')}
        </button>
        <button
          onClick={() => onRespond(req, false)}
          disabled={responding}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {t('connections.decline')}
        </button>
      </div>
    </div>
  );
}
