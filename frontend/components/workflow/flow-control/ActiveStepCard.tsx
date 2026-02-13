'use client';

import { useTranslation } from '@/lib/i18n/context';

interface ActiveStepCardProps {
  title: string | undefined;
  remainingSeconds: number | undefined;
  status: 'active' | 'paused' | undefined;
  formatTime: (totalSeconds: number) => string;
}

export default function ActiveStepCard({
  title,
  remainingSeconds,
  status,
  formatTime,
}: ActiveStepCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="text-sm text-muted-foreground mb-2">
        {t('host.flowControl.currentStep')}
      </div>
      <div className="text-xl font-bold text-primary">
        {title ?? t('host.flowControl.notStarted')}
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
