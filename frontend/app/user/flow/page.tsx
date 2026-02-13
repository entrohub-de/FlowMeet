'use client';

import { useEffect, useState } from 'react';
import { ListChecks, PauseCircle, ChevronDown, ChevronUp, TicketCheck } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { supabase } from '@/lib/supabase/client';
import { getUserCheckinStatus } from '@/lib/api/checkin';
import ActiveStepCard from '@/components/workflow/flow-control/ActiveStepCard';
import FlowStepCardReadOnly from '@/components/workflow/flow-control/FlowStepCardReadOnly';
import MatchingStepCard from '@/components/workflow/flow-control/MatchingStepCard';
import GroupMatchingStepCard from '@/components/workflow/flow-control/GroupMatchingStepCard';
import { FlowStepSkeleton } from '@/components/ui/skeleton';

export default function UserFlowPage() {
  const { t } = useTranslation();
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [checkinChecked, setCheckinChecked] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const {
    loading,
    selectedEventId,
    flowState,
    activeStep,
    formatTime,
    isGloballyPaused,
    globalPauseMessage,
  } = useActiveFlow();

  // Check if user has checked in for the selected event
  useEffect(() => {
    if (!selectedEventId) return;
    let cancelled = false;

    const checkCheckin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const statuses = await getUserCheckinStatus(user.id, selectedEventId);
        if (!cancelled) {
          setIsCheckedIn(statuses.some(s => s.checked_in));
          setCheckinChecked(true);
        }
      } catch {
        if (!cancelled) setCheckinChecked(true);
      }
    };

    checkCheckin();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  if (loading) {
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
          </div>
          <div className="space-y-3">
            <FlowStepSkeleton />
            <FlowStepSkeleton />
            <FlowStepSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative">
      {/* Global Pause Overlay (Workstream D) */}
      {isGloballyPaused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <PauseCircle className="w-16 h-16 text-white mb-4" />
          <p className="text-xl font-semibold text-white">
            {globalPauseMessage || t('globalPause.paused')}
          </p>
        </div>
      )}

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

        {/* Not checked in prompt */}
        {checkinChecked && !isCheckedIn && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center mb-6">
            <TicketCheck className="w-12 h-12 mx-auto text-amber-500 mb-3" />
            <p className="text-amber-800 font-medium text-lg mb-1">
              {t('userFlow.notCheckedIn')}
            </p>
            <p className="text-amber-600 text-sm mb-4">
              {t('userFlow.notCheckedInHint')}
            </p>
            <Link
              href="/user/checkin"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:opacity-90 transition-opacity touch-feedback"
            >
              <TicketCheck className="w-4 h-4" />
              {t('userFlow.goCheckin')}
            </Link>
          </div>
        )}

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

            <div className="mb-6">
              <ActiveStepCard
                title={activeStep?.title}
                remainingSeconds={activeStep?.remainingSeconds}
                status={activeStep?.status as 'active' | 'paused' | undefined}
                formatTime={formatTime}
              />
            </div>

            {/* Active step(s) shown prominently */}
            {flowState.steps.map((step, index) => {
              const isActive = step.status === 'active' || step.status === 'paused';
              if (!isActive) return null;

              const isActive1v1 = step.pairingMode === '1v1';
              const isActiveGroup = step.pairingMode === 'group';

              if (isActive1v1) {
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

              if (isActiveGroup) {
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

              return (
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

            {/* Collapsible section for other steps */}
            {flowState.steps.some(s => s.status !== 'active' && s.status !== 'paused') && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAllSteps(prev => !prev)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm text-muted-foreground hover:text-foreground bg-card border border-border rounded-xl shadow-sm transition-colors"
                >
                  {showAllSteps ? (
                    <>
                      {t('userFlow.hideSteps')}
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      {t('userFlow.viewAllSteps')}
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>

                {showAllSteps && (
                  <div className="mt-3 space-y-3">
                    {flowState.steps.map((step, index) => {
                      if (step.status === 'active' || step.status === 'paused') return null;
                      return (
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
                )}
              </div>
            )}

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
