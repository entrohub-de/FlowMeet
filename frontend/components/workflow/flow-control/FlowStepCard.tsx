'use client';

import { Clock, Play, Pause, CheckCircle } from 'lucide-react';
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
}: FlowStepCardProps) {
  const { t } = useTranslation();

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
            <div className="font-semibold text-foreground">{title}</div>
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
    </div>
  );
}
