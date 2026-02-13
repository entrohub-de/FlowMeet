'use client';

import { Clock, Users, Loader2, UsersRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useFlowGroupMatching } from '@/hooks/useFlowGroupMatching';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

interface GroupMatchingStepCardProps {
  index: number;
  stepId: string;
  title: string;
  status: FlowStatus;
  remainingSeconds: number;
  formatTime: (totalSeconds: number) => string;
  eventId: string;
}

export default function GroupMatchingStepCard({
  index,
  stepId,
  title,
  status,
  remainingSeconds,
  formatTime,
  eventId,
}: GroupMatchingStepCardProps) {
  const { t } = useTranslation();
  const { state, toggleReady } = useFlowGroupMatching(eventId, stepId, status, 'group');

  return (
    <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden">
      {/* Step header */}
      <div className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-emerald-500 text-white">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{title}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              {t('flowGroupMatching.badge')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span
              className={`font-mono font-semibold ${
                remainingSeconds <= 0
                  ? 'text-red-500'
                  : status === 'paused'
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>
            {status === 'active' && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                {t('host.flowControl.inProgress')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Group matching content */}
      <div className="px-4 pb-4">
        {/* Phase: Ready prompt */}
        {state.phase === 'ready_prompt' && (
          <div className="bg-background rounded-lg p-6 text-center space-y-4">
            <Users className="w-12 h-12 mx-auto text-emerald-500/60" />
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {t('flowGroupMatching.readyToGroup')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('flowMatching.readyCount', {
                  ready: state.readyCount,
                  total: state.totalPresent,
                })}
              </p>
            </div>
            <button
              onClick={toggleReady}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              {t('flowGroupMatching.readyButton')}
            </button>
          </div>
        )}

        {/* Phase: Waiting */}
        {state.phase === 'waiting' && (
          <div className="bg-background rounded-lg p-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-emerald-500 animate-spin" />
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {t('flowGroupMatching.waitingForGroup')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('flowMatching.readyCount', {
                  ready: state.readyCount,
                  total: state.totalPresent,
                })}
              </p>
            </div>
            <button
              onClick={toggleReady}
              className="px-4 py-2 border border-border text-muted-foreground rounded-lg text-sm hover:bg-muted transition-colors"
            >
              {t('flowGroupMatching.cancelReady')}
            </button>
            {state.isUngrouped && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2">
                {t('flowGroupMatching.ungrouped')}
              </p>
            )}
          </div>
        )}

        {/* Phase: Grouped */}
        {state.phase === 'grouped' && state.group && (
          <div className="bg-background rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 font-medium">
              <UsersRound className="w-5 h-5" />
              {t('flowGroupMatching.groupAssigned')}
            </div>

            {/* Group members */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t('flowGroupMatching.yourGroup')} ({state.group.members.length} {t('venue.people')})
              </h4>
              <div className="grid gap-2">
                {state.group.members.map((member) => (
                  <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-200 to-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-emerald-700">
                        {member.profile?.nickname?.[0] || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {member.profile?.nickname || t('user.anonymous')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.profile?.gender || ''} {member.profile?.age_group || ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Phase: idle */}
        {state.phase === 'idle' && (
          <div className="bg-background rounded-lg p-4 text-center text-muted-foreground text-sm">
            {t('flowMatching.waitingToStart')}
          </div>
        )}
      </div>
    </div>
  );
}
