'use client';

import { ListChecks } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import FlowStatusCards from '@/components/workflow/flow-control/FlowStatusCards';
import FlowStepCardReadOnly from '@/components/workflow/flow-control/FlowStepCardReadOnly';
import MatchingStepCard from '@/components/workflow/flow-control/MatchingStepCard';

export default function UserFlowPage() {
  const { t } = useTranslation();
  const {
    loading,
    selectedEventId,
    flowState,
    activeStep,
    totalDuration,
    formatTime,
  } = useActiveFlow();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              {t('userFlow.title')}
            </h1>
          </div>
          <p className="text-muted-foreground">{t('userFlow.description')}</p>
        </div>

        {!flowState ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <ListChecks className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">{t('userFlow.noActiveFlow')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('userFlow.noActiveFlowHint')}</p>
          </div>
        ) : (
          <>
            {flowState.templateName && (
              <div className="mb-4 text-sm text-muted-foreground">
                {t('userFlow.templateName')}: {flowState.templateName}
              </div>
            )}

            <FlowStatusCards
              activeStepTitle={activeStep?.title}
              activeStepRemainingSeconds={activeStep?.remainingSeconds}
              activeStepStatus={activeStep?.status as 'active' | 'paused' | undefined}
              totalDuration={totalDuration}
              formatTime={formatTime}
            />

            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">
                  {t('host.flowControl.flowProcess')}
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {flowState.steps.map((step, index) => {
                    const isActiveMatching =
                      step.pairingMode === '1v1' &&
                      (step.status === 'active' || step.status === 'paused');

                    return isActiveMatching ? (
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
                    ) : (
                      <FlowStepCardReadOnly
                        key={step.id}
                        index={index}
                        title={step.title}
                        duration={step.duration}
                        status={step.status}
                        remainingSeconds={step.remainingSeconds}
                        formatTime={formatTime}
                        pairingMode={step.pairingMode}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {flowState.flowStatus === 'completed' && (
              <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 text-center text-green-700 font-medium">
                {t('userFlow.flowCompleted')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
