'use client';

import { CheckCircle2, Coffee, Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface ActiveStepCardProps {
  title: string | undefined;
  remainingSeconds: number | undefined;
  status: 'active' | 'paused' | undefined;
  formatTime: (totalSeconds: number) => string;
  /** Number of completed steps (used for intermission state) */
  completedCount?: number;
  /** Total number of steps */
  totalCount?: number;
  /** Title of the next pending step */
  nextStepTitle?: string;
  /** Whether the entire flow has been completed */
  flowCompleted?: boolean;
}

export default function ActiveStepCard({
  title,
  remainingSeconds,
  status,
  formatTime,
  completedCount = 0,
  totalCount = 0,
  nextStepTitle,
  flowCompleted = false,
}: ActiveStepCardProps) {
  const { t } = useTranslation();

  // Flow completed state: event has ended
  if (flowCompleted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm text-center">
        <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <div className="text-xl font-bold text-green-700">
          {t('globalPause.eventEnded')}
        </div>
        <p className="text-sm text-green-600 mt-2">
          {t('globalPause.eventEndedHint')}
        </p>
      </div>
    );
  }

  const isIntermission = !title && completedCount > 0;
  const isWaitingToBegin = !title && completedCount === 0;

  // Intermission state: between steps
  if (isIntermission) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="text-sm text-muted-foreground mb-2">
          {t('host.flowControl.currentStep')}
        </div>
        <div className="flex items-center gap-2 text-xl font-bold text-muted-foreground">
          <Coffee className="w-5 h-5" />
          {t('userFlow.intermission')}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t('userFlow.intermissionHint')}
        </p>
        <div className="flex flex-col gap-1 mt-3">
          <span className="text-xs text-muted-foreground">
            {t('userFlow.completedCount', { completed: completedCount, total: totalCount })}
          </span>
          {nextStepTitle && (
            <span className="text-sm font-medium text-foreground">
              {t('userFlow.nextStep', { title: nextStepTitle })}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  // Waiting to begin state: flow loaded but first step hasn't started
  if (isWaitingToBegin) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="text-sm text-muted-foreground mb-2">
          {t('host.flowControl.currentStep')}
        </div>
        <div className="flex items-center gap-2 text-xl font-bold text-muted-foreground">
          <Clock className="w-5 h-5" />
          {t('userFlow.waitingToBegin')}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t('userFlow.waitingToBeginHint')}
        </p>
      </div>
    );
  }

  // Active / paused step state
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="text-sm text-muted-foreground mb-2">
        {t('host.flowControl.currentStep')}
      </div>
      <div className="text-xl font-bold text-primary">
        {title}
      </div>
      {remainingSeconds !== undefined && status && (
        <div
          className={`text-2xl font-mono font-bold mt-1 ${
            remainingSeconds <= 0
              ? 'text-red-500'
              : status === 'paused'
              ? 'text-amber-600'
              : 'text-foreground'
          }`}
        >
          {formatTime(remainingSeconds)}
          {status === 'paused' && (
            <span className="ml-2 text-sm font-sans text-amber-600">
              {t('host.flowControl.paused')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
