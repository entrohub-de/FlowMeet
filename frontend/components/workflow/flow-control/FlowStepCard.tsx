'use client';

import { useState } from 'react';
import { Clock, Play, Pause, CheckCircle, Users, Zap, ChevronDown, ChevronUp, BarChart3, AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { MatchQualityInfo } from '@/hooks/useHostFlowMatching';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

interface FlowStepCardProps {
  id: string;
  index: number;
  title: string;
  duration: number;
  status: FlowStatus;
  remainingSeconds: number;
  formatTime: (totalSeconds: number) => string;
  onStatusChange: (stepId: string, newStatus: FlowStatus) => void;
  pairingMode?: 'group' | '1v1';
  matchingReadyCount?: number;
  matchingTotalCount?: number;
  matchingPairedCount?: number;
  onTriggerMatching?: (stepId: string) => void;
  isMatching?: boolean;
  matchingError?: string | null;
  // Group matching props
  groupReadyCount?: number;
  groupTotalCount?: number;
  groupedCount?: number;
  onTriggerGrouping?: (groupSize: number) => void;
  isGrouping?: boolean;
  // Match quality
  matchQuality?: MatchQualityInfo | null;
}

const cardStyles: Record<FlowStatus, string> = {
  active: 'border-primary bg-primary/5 active-step-pulse',
  paused: 'border-amber-300 bg-amber-50/50',
  completed: 'border-green-200 bg-green-50/50',
  pending: 'border-border bg-background',
};

const badgeStyles: Record<FlowStatus, string> = {
  active: 'bg-primary text-white',
  paused: 'bg-amber-500 text-white',
  completed: 'bg-green-500 text-white',
  pending: 'bg-muted text-muted-foreground',
};

function getScoreLevel(score: number): { label: string; color: string; key: string } {
  if (score >= 70) return { label: '', color: 'text-green-600', key: 'matchQuality.excellent' };
  if (score >= 50) return { label: '', color: 'text-blue-600', key: 'matchQuality.good' };
  return { label: '', color: 'text-yellow-600', key: 'matchQuality.fair' };
}

function getScoreDistribution(pairs: { score: number }[]): { excellent: number; good: number; fair: number } {
  let excellent = 0, good = 0, fair = 0;
  for (const p of pairs) {
    if (p.score >= 70) excellent++;
    else if (p.score >= 50) good++;
    else fair++;
  }
  return { excellent, good, fair };
}

export default function FlowStepCard({
  id,
  index,
  title,
  duration,
  status,
  remainingSeconds,
  formatTime,
  onStatusChange,
  pairingMode,
  matchingReadyCount,
  matchingTotalCount,
  matchingPairedCount,
  onTriggerMatching,
  isMatching,
  matchingError,
  groupReadyCount,
  groupTotalCount,
  groupedCount,
  onTriggerGrouping,
  isGrouping,
  matchQuality,
}: FlowStepCardProps) {
  const { t } = useTranslation();
  const [qualityExpanded, setQualityExpanded] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  const is1v1Active = pairingMode === '1v1' && (status === 'active' || status === 'paused');
  const isGroupActive = pairingMode === 'group' && (status === 'active' || status === 'paused');

  // Time progress calculation
  const totalSeconds = duration * 60;
  const elapsed = totalSeconds - remainingSeconds;
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100)) : 0;

  const handleCompleteClick = () => {
    setShowCompleteConfirm(true);
  };

  const handleConfirmComplete = () => {
    setShowCompleteConfirm(false);
    onStatusChange(id, 'completed');
  };

  return (
    <div className={`p-4 rounded-lg border-2 transition-all ${cardStyles[status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${badgeStyles[status]}`}
          >
            {status === 'completed' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              index + 1
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-foreground">
              {title}
              {pairingMode === '1v1' && (
                <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                  1v1
                </span>
              )}
              {pairingMode === 'group' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                  {t('flowGroupMatching.badge')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {status === 'active' || status === 'paused' ? (
                <span
                  className={`font-mono font-semibold ${
                    remainingSeconds <= 0
                      ? 'text-red-500'
                      : status === 'paused'
                      ? 'text-amber-600'
                      : 'text-primary'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </span>
              ) : (
                <span>
                  {t('host.flowControl.minutesSuffix', { minutes: duration })}
                </span>
              )}
              {status === 'active' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  {t('host.flowControl.inProgress')}
                </span>
              )}
              {status === 'paused' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  {t('host.flowControl.paused')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <button
              type="button"
              onClick={() => onStatusChange(id, 'active')}
              className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 touch-feedback"
            >
              <Play className="w-4 h-4" />
              {t('host.flowControl.start')}
            </button>
          )}
          {status === 'active' && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(id, 'paused')}
                className="px-4 py-2 rounded-button border border-border hover:bg-muted transition-colors flex items-center gap-2 touch-feedback"
              >
                <Pause className="w-4 h-4" />
                {t('host.flowControl.pause')}
              </button>
              <button
                type="button"
                onClick={handleCompleteClick}
                className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2 touch-feedback"
              >
                <CheckCircle className="w-4 h-4" />
                {t('host.flowControl.complete')}
              </button>
            </>
          )}
          {status === 'paused' && (
            <>
              <button
                type="button"
                onClick={() => onStatusChange(id, 'active')}
                className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2 touch-feedback"
              >
                <Play className="w-4 h-4" />
                {t('host.flowControl.resume')}
              </button>
              <button
                type="button"
                onClick={handleCompleteClick}
                className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2 touch-feedback"
              >
                <CheckCircle className="w-4 h-4" />
                {t('host.flowControl.complete')}
              </button>
            </>
          )}
          {status === 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange(id, 'pending')}
              className="px-4 py-2 rounded-button bg-green-100 text-green-700 font-medium hover:bg-green-200 transition-colors"
            >
              {t('host.flowControl.completed')}
            </button>
          )}
        </div>
      </div>

      {/* 1v1 Matching controls for host */}
      {is1v1Active && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {t('flowMatching.readyCount', {
                ready: matchingReadyCount ?? 0,
                total: matchingTotalCount ?? 0,
              })}
            </span>
          </div>
          {(matchingPairedCount ?? 0) > 0 && (
            <span className="text-sm text-green-600 font-medium">
              {t('flowMatching.pairedCount', { count: matchingPairedCount ?? 0 })}
            </span>
          )}
          <button
            type="button"
            onClick={() => onTriggerMatching?.(id)}
            disabled={isMatching || (matchingReadyCount ?? 0) < 2}
            className="ml-auto px-4 py-2 rounded-button bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-feedback"
          >
            <Zap className="w-4 h-4" />
            {isMatching ? t('flowMatching.matching') : t('flowMatching.matchNow')}
          </button>
          {matchingError && (
            <p className="w-full text-sm text-red-600">{matchingError}</p>
          )}
        </div>
      )}

      {/* Match Quality Panel */}
      {matchQuality && matchQuality.totalPairs > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={() => setQualityExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <span className="font-medium text-foreground">
                {t('matchQuality.pairCount', { count: matchQuality.totalPairs })}
              </span>
              <span className="text-muted-foreground">
                {t('matchQuality.avgScore', { score: matchQuality.avgScore })}
              </span>
              {matchQuality.historyExcluded && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  {t('matchQuality.noRepeats')}
                </span>
              )}
            </div>
            {qualityExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {qualityExpanded && (
            <div className="mt-3 space-y-3">
              {/* Score distribution */}
              {(() => {
                const dist = getScoreDistribution(matchQuality.pairs);
                return (
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-green-600 font-medium">
                      {t('matchQuality.excellent')}: {dist.excellent}
                    </span>
                    <span className="text-blue-600 font-medium">
                      {t('matchQuality.good')}: {dist.good}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {t('matchQuality.fair')}: {dist.fair}
                    </span>
                  </div>
                );
              })()}

              {/* Pair list */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {matchQuality.pairs.map((pair, i) => {
                  const level = getScoreLevel(pair.score);
                  return (
                    <div
                      key={`${pair.user1Id}-${pair.user2Id}`}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/50"
                    >
                      <span className="text-muted-foreground font-mono">
                        #{i + 1}
                      </span>
                      <span className="text-muted-foreground truncate mx-2 flex-1">
                        {pair.reasons.join(', ')}
                      </span>
                      <span className={`font-semibold ${level.color}`}>
                        {pair.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group Matching controls for host */}
      {isGroupActive && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>
              {t('flowMatching.readyCount', {
                ready: groupReadyCount ?? 0,
                total: groupTotalCount ?? 0,
              })}
            </span>
          </div>
          {(groupedCount ?? 0) > 0 && (
            <span className="text-sm text-emerald-600 font-medium">
              {t('flowGroupMatching.groupedCount', { count: groupedCount ?? 0 })}
            </span>
          )}
          <button
            type="button"
            onClick={() => onTriggerGrouping?.(4)}
            disabled={isGrouping || (groupReadyCount ?? 0) < 2}
            className="ml-auto px-4 py-2 rounded-button bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-feedback"
          >
            <Zap className="w-4 h-4" />
            {isGrouping ? t('flowGroupMatching.grouping') : t('flowGroupMatching.groupNow')}
          </button>
        </div>
      )}

      {/* Time progress bar for active steps */}
      {(status === 'active' || status === 'paused') && (
        <div className="mt-3 time-progress-bar">
          <div
            className="time-progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Complete confirmation dialog */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full">
            <div className="flex items-start gap-3 p-5">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {t('ux.host.confirmComplete')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button
                type="button"
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-button border border-border hover:bg-muted transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                className="flex-1 px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
              >
                {t('ux.host.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
