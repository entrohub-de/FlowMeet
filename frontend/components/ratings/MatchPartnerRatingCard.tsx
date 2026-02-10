import { useTranslation } from '@/lib/i18n/context';
import { StarRating } from './StarRating';
import type { Match, MatchRating } from '@/types/domain';

interface MatchPartnerRatingCardProps {
  matches: Match[];
  matchRatings: Record<string, MatchRating>;
  userId: string | null;
  onSubmit: (matchId: string, score: number, comment?: string) => Promise<void>;
  submitting: boolean;
}

export function MatchPartnerRatingCard({
  matches,
  matchRatings,
  userId,
  onSubmit,
  submitting,
}: MatchPartnerRatingCardProps) {
  const { t } = useTranslation();

  const handleRatingChange = async (matchId: string, score: number) => {
    if (score === 0) return;
    await onSubmit(matchId, score);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-2">{t('rating.matchPartner.title')}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t('rating.matchPartner.description')}
      </p>

      {matches.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">
          {t('rating.matchPartner.noMatches')}
        </p>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const partnerProfile =
              match.user1_id === userId ? match.user2_profile : match.user1_profile;
            const currentRating = matchRatings[match.match_id];

            return (
              <div
                key={match.match_id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-primary">
                      {partnerProfile?.nickname?.[0] || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {partnerProfile?.nickname || 'Anonymous'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {partnerProfile?.gender} · {partnerProfile?.age_group}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('rating.matchPartner.title')}
                  </label>
                  <StarRating
                    value={currentRating?.score || 0}
                    onChange={(value) => handleRatingChange(match.match_id, value)}
                    readonly={submitting}
                    size="md"
                    showLabel
                  />
                </div>

                {currentRating && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600">✓ {t('rating.submitted')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
