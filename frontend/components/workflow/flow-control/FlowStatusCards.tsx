'use client';

import { useTranslation } from '@/lib/i18n/context';

interface FlowStatusCardsProps {
  activeStepTitle: string | undefined;
  activeStepRemainingSeconds: number | undefined;
  activeStepStatus: 'active' | 'paused' | undefined;
  totalDuration: number;
  formatTime: (totalSeconds: number) => string;
}

export default function FlowStatusCards({
  activeStepTitle,
  activeStepRemainingSeconds,
  activeStepStatus,
  totalDuration,
  formatTime,
}: FlowStatusCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="text-sm text-muted-foreground mb-2">
          {t('host.flowControl.currentStep')}
        </div>
        <div className="text-xl font-bold text-primary">
          {activeStepTitle ?? t('host.flowControl.notStarted')}
        </div>
        {activeStepRemainingSeconds !== undefined && activeStepStatus && (
          <div
            className={`text-2xl font-mono font-bold mt-1 ${
              activeStepRemainingSeconds <= 0
                ? 'text-red-500'
                : activeStepStatus === 'paused'
                ? 'text-amber-600'
                : 'text-foreground'
            }`}
          >
            {formatTime(activeStepRemainingSeconds)}
            {activeStepStatus === 'paused' && (
              <span className="ml-2 text-sm font-sans text-amber-600">
                {t('host.flowControl.paused')}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="text-sm text-muted-foreground mb-2">
          {t('host.flowControl.totalDuration')}
        </div>
        <div className="text-3xl font-bold text-foreground">
          {t('host.flowControl.minutesSuffix', { minutes: totalDuration })}
        </div>
      </div>
    </div>
  );
}
