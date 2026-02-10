import { UserPlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getMatchLevel } from '@/lib/api/matching-algorithm';
import type { MatchScore } from '@/lib/api/matching-algorithm';

interface RecommendationCardProps {
  recommendation: MatchScore;
  onRequestMatch: (userId: string) => void;
}

export function RecommendationCard({
  recommendation,
  onRequestMatch,
}: RecommendationCardProps) {
  const { t } = useTranslation();
  const matchLevel = getMatchLevel(recommendation.score);

  return (
    <div className="bg-card border-2 border-border rounded-xl p-5 hover:shadow-lg transition-all hover:border-primary/30">
      {/* 用户信息 */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-semibold text-primary">
            {recommendation.profile.nickname?.[0] || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1">
            {recommendation.profile.nickname || t('user.anonymous')}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            {recommendation.profile.gender || ''}{' '}
            {recommendation.profile.age_group || ''}
          </p>
          {/* 匹配度徽章 */}
          <div className="flex items-center gap-2">
            <div className={`text-xs font-medium ${matchLevel.color}`}>
              {matchLevel.label}
            </div>
            <div className="text-xs font-bold text-primary">
              {recommendation.score}%
            </div>
          </div>
        </div>
      </div>

      {/* 匹配原因 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {recommendation.reasons.slice(0, 3).map((reason, idx) => (
          <div
            key={idx}
            className="text-xs bg-primary/5 text-primary px-2 py-1 rounded"
          >
            {reason}
          </div>
        ))}
      </div>

      {/* 配对按钮 */}
      <button
        onClick={() => onRequestMatch(recommendation.userId)}
        className="w-full px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        <span>{t('user.requestMatch')}</span>
      </button>
    </div>
  );
}
