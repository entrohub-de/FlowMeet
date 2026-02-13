'use client';

import { Clock, Play, Pause, CheckCircle, Users, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

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
}

const cardStyles: Record<FlowStatus, string> = {
  active: 'border-primary bg-primary/5',
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
}: FlowStepCardProps) {
  const { t } = useTranslation();

  const is1v1Active = pairingMode === '1v1' && (status === 'active' || status === 'paused');
  const isGroupActive = pairingMode === 'group' && (status === 'active' || status === 'paused');

  return (
    <div className={`p-4 rounded-lg border transition-all ${cardStyles[status]}`}>
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
              className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
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
                className="px-4 py-2 rounded-button border border-border hover:bg-muted transition-colors flex items-center gap-2"
              >
                <Pause className="w-4 h-4" />
                {t('host.flowControl.pause')}
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(id, 'completed')}
                className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
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
                className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {t('host.flowControl.resume')}
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(id, 'completed')}
                className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
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
            className="ml-auto px-4 py-2 rounded-button bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {isMatching ? t('flowMatching.matching') : t('flowMatching.matchNow')}
          </button>
          {matchingError && (
            <p className="w-full text-sm text-red-600">{matchingError}</p>
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
            className="ml-auto px-4 py-2 rounded-button bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4" />
            {isGrouping ? t('flowGroupMatching.grouping') : t('flowGroupMatching.groupNow')}
          </button>
        </div>
      )}
    </div>
  );
}
