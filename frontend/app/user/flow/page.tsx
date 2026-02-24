'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PauseCircle, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { useFlowMatching } from '@/hooks/useFlowMatching';
import { supabase } from '@/lib/supabase/client';


import { upsertParticipantState } from '@/lib/api/participant-state';
import { toast } from 'sonner';


import MatchingStepCard from '@/components/workflow/flow-control/MatchingStepCard';
import GroupMatchingStepCard from '@/components/workflow/flow-control/GroupMatchingStepCard';
import { FlowStepSkeleton } from '@/components/ui/skeleton';



export default function UserFlowPage() {
  const { t } = useTranslation();
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const {
    loading,
    selectedEventId,
    flowState,
    activeStep,
    formatTime,
    isGloballyPaused,
    globalPauseMessage,
  } = useActiveFlow();

  const permissions = flowState?.permissions ?? null;
  const matching1v1Enabled = permissions?.matching_1v1_enabled ?? false;

  const { state: matchingState, toggleReady, resetMatch } = useFlowMatching(
    selectedEventId,
    '1v1',
    matching1v1Enabled
  );

  const completedCount = useMemo(
    () => flowState?.steps.filter((s) => s.status === 'completed').length ?? 0,
    [flowState?.steps]
  );
  const totalCount = flowState?.steps.length ?? 0;
  const nextPendingStep = useMemo(
    () => flowState?.steps.find((s) => s.status === 'pending'),
    [flowState?.steps]
  );

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);


  const handleFinishRound = useCallback(async () => {
    if (!currentUserId || !selectedEventId) return;
    try {
      await upsertParticipantState(selectedEventId, currentUserId, {
        participant_status: 'waiting',
        current_match_id: null,
      });
      resetMatch();
    } catch {
      toast.error(t('common.error'));
    }
  }, [currentUserId, selectedEventId, resetMatch, t]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            <FlowStepSkeleton />
            <FlowStepSkeleton />
            <FlowStepSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Show flow content
  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative">
      {/* Brand glow */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />

      {/* Global Pause Overlay */}
      {isGloballyPaused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <PauseCircle className="w-16 h-16 text-white mb-4" />
          <p className="text-xl font-semibold text-white">
            {globalPauseMessage || t('globalPause.paused')}
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative">



        {/* Permission-driven 1v1 matching entry */}
        {matching1v1Enabled && (
          <div className="bg-card rounded-2xl border border-primary/20 p-5 space-y-4 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{t('userFlow.matchingOpen')}</h3>
            </div>

            {matchingState.phase === 'ready_prompt' && (
              <button
                onClick={toggleReady}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity touch-feedback"
              >
                {t('userFlow.joinMatching')}
              </button>
            )}

            {matchingState.phase === 'waiting' && (
              <div className="text-center space-y-2">
                <div className="animate-pulse text-primary">
                  <Users className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground">{t('userFlow.waitingForMatch')}</p>
                <p className="text-xs text-muted-foreground">
                  {matchingState.readyCount} {t('userFlow.peopleWaiting')}
                </p>
                <button
                  onClick={toggleReady}
                  className="text-xs text-muted-foreground underline"
                >
                  {t('userFlow.cancelReady')}
                </button>
              </div>
            )}

            {matchingState.phase === 'matched' && matchingState.partner && (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-lg font-semibold">{t('userFlow.matchFound')}</p>
                  <p className="text-sm text-muted-foreground">
                    {matchingState.partner.profile?.nickname || t('userFlow.anonymous')}
                  </p>
                </div>
                <button
                  onClick={handleFinishRound}
                  className="w-full py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
                >
                  {t('userFlow.finishRound')}
                </button>
              </div>
            )}
          </div>
        )}

        {!flowState ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Users className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-medium">{t('userFlow.noActiveFlow')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('userFlow.waitingHint')}</p>
          </div>
        ) : (
          <>

            {/* Active steps */}
            {flowState.steps.map((step, index) => {
              const isActive = step.status === 'active' || step.status === 'paused';
              if (!isActive) return null;

              if (step.pairingMode === '1v1') {
                return (
                  <MatchingStepCard
                    key={step.id}
                    index={index}
                    stepId={step.id}
                    title={step.title}
                    status={step.status}
                    remainingSeconds={step.remainingSeconds}
                    formatTime={formatTime}
                    eventId={selectedEventId}
                  />
                );
              }

              if (step.pairingMode === 'group') {
                return (
                  <GroupMatchingStepCard
                    key={step.id}
                    index={index}
                    stepId={step.id}
                    title={step.title}
                    status={step.status}
                    remainingSeconds={step.remainingSeconds}
                    formatTime={formatTime}
                    eventId={selectedEventId}
                  />
                );
              }

              return null;
            })}

          </>
        )}
      </div>

    </div>
  );
}
