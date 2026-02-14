'use client';

import { useTranslation } from '@/lib/i18n/context';
import ActiveStepCard from './ActiveStepCard';

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
    <div className="grid grid-cols-2 gap-3 mb-4">
      <ActiveStepCard
        title={activeStepTitle}
        remainingSeconds={activeStepRemainingSeconds}
        status={activeStepStatus}
        formatTime={formatTime}
      />
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="text-xs text-muted-foreground mb-1">
          {t('host.flowControl.totalDuration')}
        </div>
        <div className="text-2xl font-bold text-foreground">
          {t('host.flowControl.minutesSuffix', { minutes: totalDuration })}
        </div>
      </div>
    </div>
  );
}
