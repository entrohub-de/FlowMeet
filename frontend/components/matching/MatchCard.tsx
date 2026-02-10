import { Check, X, MessageSquare } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { Match, Profile } from '@/types/domain';

interface MatchCardProps {
  match: Match;
  partner: Profile | undefined;
  isPending: boolean;
  onAccept: (matchId: string) => void;
  onDecline: (matchId: string) => void;
  onComplete: (matchId: string) => void;
}

export function MatchCard({
  match,
  partner,
  isPending,
  onAccept,
  onDecline,
  onComplete,
}: MatchCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {partner?.nickname?.[0] || '?'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {partner?.nickname || t('user.anonymous')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {partner?.gender || ''} {partner?.age_group || ''}
              </p>
            </div>
          </div>

          <div className="ml-15">
            <span
              className={`inline-block text-xs px-2 py-1 rounded-full border ${
                match.status === 'accepted'
                  ? 'bg-primary/20 text-primary border-primary/40'
                  : match.status === 'pending'
                    ? 'bg-accent/20 text-accent border-accent/40'
                    : match.status === 'completed'
                      ? 'bg-muted text-muted-foreground border-border'
                      : 'bg-muted/50 text-muted-foreground border-border'
              }`}
            >
              {t(`user.matchStatus.${match.status}`)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {isPending && (
            <>
              <button
                onClick={() => onAccept(match.match_id)}
                className="px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors flex items-center justify-center"
                title={t('user.accept')}
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDecline(match.match_id)}
                className="px-button h-button bg-destructive text-destructive-foreground rounded-button hover:bg-destructive/90 transition-colors flex items-center justify-center"
                title={t('user.decline')}
              >
                <X className="w-5 h-5" />
              </button>
            </>
          )}
          {match.status === 'accepted' && (
            <button
              onClick={() => onComplete(match.match_id)}
              className="px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('user.markCompleted')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
