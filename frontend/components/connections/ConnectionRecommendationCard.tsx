'use client';

import { useTranslation } from '@/lib/i18n/context';
import { type Recommendation } from '@/lib/api/post-event-matching';
import { getMatchLevel } from '@/lib/api/matching-algorithm';
import { CalendarDays, Send, Loader2 } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ConnectionRecommendationCardProps {
  recommendation: Recommendation;
  sending: boolean;
  onSendRequest: (rec: Recommendation) => void;
}

export function ConnectionRecommendationCard({ recommendation: rec, sending, onSendRequest }: ConnectionRecommendationCardProps) {
  const { t } = useTranslation();
  const level = getMatchLevel(rec.score);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={null} name={rec.nickname} />
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
          onClick={() => onSendRequest(rec)}
          disabled={sending}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {t('connections.connect')}
        </button>
      </div>

      {rec.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rec.reasons.map((reason, i) => (
            <span key={i} className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
              {reason}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
