import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useConversationTopics } from '@/hooks/useConversationTopics';
import { getMatchLevel } from '@/lib/api/matching-algorithm';
import type { Match } from '@/types/domain';
import { GenerateButton } from './GenerateButton';
import { TopicList } from './TopicList';

interface TopicCardProps {
  match: Match;
  currentUserId: string;
}

export function TopicCard({ match, currentUserId }: TopicCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    topics,
    loading,
    error,
    canGenerate,
    generateTopics,
    loadTopics,
  } = useConversationTopics();

  // Determine which profile is the partner
  const partnerProfile =
    match.user1_id === currentUserId ? match.user2_profile : match.user1_profile;

  const matchScore = 75; // You could calculate this based on matching algorithm
  const matchLevel = getMatchLevel(matchScore);

  // Check if this is a demo match
  const isDemoMatch = match.match_id.startsWith('demo-');

  // Load existing topics when expanded (skip for demo matches)
  useEffect(() => {
    if (isExpanded && !topics && !loading && !isDemoMatch) {
      loadTopics(match.match_id);
    }
  }, [isExpanded, match.match_id, topics, loading, loadTopics, isDemoMatch]);

  const handleGenerate = async () => {
    await generateTopics(match.match_id);
  };

  const getTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <div className="bg-card border-2 border-border rounded-xl overflow-hidden hover:shadow-lg transition-all">
      {/* Match Header */}
      <div
        className="p-5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-semibold text-primary">
              {partnerProfile?.nickname?.[0] || '?'}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {partnerProfile?.nickname || t('user.anonymous')}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {partnerProfile?.gender || ''}{' '}
                  {partnerProfile?.age_group || ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`text-xs font-medium ${matchLevel.color}`}>
                  {matchLevel.label}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Status badge */}
            {topics && !isExpanded && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('topic.lastGenerated').replace(
                  '{time}',
                  getTimeAgo(topics.generated_at)
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          {/* Demo Mode Notice */}
          {isDemoMatch && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
              🎭 <strong>演示模式：</strong>这是模拟数据。要实际生成话题，请使用真实的配对数据或配置 OpenAI API 密钥。
            </div>
          )}

          {/* Error Message */}
          {error && !isDemoMatch && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Topics Display */}
          {topics && topics.topics.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('topic.lastGenerated').replace(
                    '{time}',
                    getTimeAgo(topics.generated_at)
                  )}
                </p>
              </div>
              <TopicList topics={topics.topics} />
            </div>
          )}

          {/* No Topics Yet */}
          {!topics && !loading && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                No topics generated yet. Click the button below to generate personalized
                conversation starters!
              </p>
            </div>
          )}

          {/* Generate Button */}
          <GenerateButton
            onGenerate={handleGenerate}
            loading={loading}
            disabled={isDemoMatch || !canGenerate.allowed || loading}
            isRegenerate={Boolean(topics)}
            minutesRemaining={canGenerate.minutesRemaining}
          />

          {isDemoMatch && (
            <p className="text-xs text-center text-muted-foreground">
              演示模式下无法生成实际话题。使用真实配对数据来测试此功能。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
