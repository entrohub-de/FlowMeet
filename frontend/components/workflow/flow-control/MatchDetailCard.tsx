'use client';

import { useEffect, useState } from 'react';
import { Globe, Sparkles, Briefcase, TrendingUp, Rocket, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { Preferences, ConversationTopic } from '@/types/domain';

interface MatchDetailCardProps {
  matchId: string;
  partnerId: string;
}

function getScoreStyle(score: number) {
  if (score >= 70) return { bar: 'bg-green-500', label: 'matchDetail.excellent' as const };
  if (score >= 50) return { bar: 'bg-blue-500', label: 'matchDetail.good' as const };
  if (score >= 30) return { bar: 'bg-yellow-500', label: 'matchDetail.fair' as const };
  return { bar: 'bg-gray-400', label: 'matchDetail.low' as const };
}

export default function MatchDetailCard({ matchId, partnerId }: MatchDetailCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchReasons, setMatchReasons] = useState<string[] | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [topics, setTopics] = useState<ConversationTopic | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [matchResult, prefResult] = await Promise.all([
          supabase
            .from('match_records')
            .select('match_score, match_reasons')
            .eq('match_id', matchId)
            .single(),
          supabase
            .from('usr_preferences')
            .select('*')
            .eq('user_id', partnerId)
            .limit(1),
        ]);

        if (cancelled) return;

        if (matchResult.data) {
          setMatchScore(matchResult.data.match_score);
          setMatchReasons(matchResult.data.match_reasons);
        }

        if (prefResult.data && prefResult.data.length > 0) {
          setPreferences(prefResult.data[0] as Preferences);
        }
      } catch (err) {
        console.error('Failed to fetch match details:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [matchId, partnerId]);

  // Poll for conversation topics (auto-generated after match)
  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 5;

    const pollTopics = async () => {
      const { data } = await supabase
        .from('evt_conversation_topics')
        .select('*')
        .eq('match_id', matchId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (data) {
        setTopics(data as ConversationTopic);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(pollTopics, 3000);
      }
    };

    pollTopics();
    return () => { cancelled = true; };
  }, [matchId]);

  if (loading) {
    return (
      <div className="pt-3 border-t border-border space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    );
  }

  const hasPreferences = preferences && (
    preferences.languages || preferences.interests ||
    preferences.industry_background || preferences.startup_stage
  );

  if (matchScore === null && !matchReasons?.length && !hasPreferences) {
    return null;
  }

  const scoreStyle = matchScore !== null ? getScoreStyle(matchScore) : null;

  return (
    <div className="pt-3 border-t border-border space-y-3 animate-slide-up-fade">
      {/* Score section */}
      {matchScore !== null && scoreStyle && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {t('matchDetail.score')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t(scoreStyle.label)}
              </span>
              <span className="text-sm font-bold text-primary">
                {matchScore}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', scoreStyle.bar)}
              style={{ width: `${matchScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Reasons section */}
      {matchReasons && matchReasons.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t('matchDetail.reasons')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {matchReasons.map((reason, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/5 text-primary px-2 py-1 rounded"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Partner preferences section */}
      {hasPreferences && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('matchDetail.partnerPreferences')}
          </span>
          <div className="grid gap-2">
            {preferences.languages && (
              <div className="flex items-start gap-2 text-sm">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t('matchDetail.languages')}</span>
                  <p className="text-foreground">{preferences.languages}</p>
                </div>
              </div>
            )}
            {preferences.interests && (
              <div className="flex items-start gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t('matchDetail.interests')}</span>
                  <p className="text-foreground">{preferences.interests}</p>
                </div>
              </div>
            )}
            {preferences.startup_stage && (
              <div className="flex items-start gap-2 text-sm">
                <Rocket className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t('matchDetail.startupStage')}</span>
                  <p className="text-foreground">{preferences.startup_stage}</p>
                </div>
              </div>
            )}
            {preferences.industry_background && (
              <div className="flex items-start gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-muted-foreground">{t('matchDetail.professionalBackground')}</span>
                  <p className="text-foreground">{preferences.industry_background}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation topics section */}
      {topics && topics.topics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t('matchDetail.conversationTopics')}
            </span>
          </div>
          <div className="space-y-2">
            {topics.topics.slice(0, 3).map((topic, idx) => (
              <div
                key={idx}
                className="bg-primary/5 rounded-lg p-3 space-y-1"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {topic.category}
                </span>
                <p className="text-sm text-foreground">{topic.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
