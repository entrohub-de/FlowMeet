'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, PauseCircle, ChevronDown, ChevronUp, TicketCheck, BadgeCheck, LogOut, Calendar, MapPin, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import FullscreenBadge from '@/components/event/FullscreenBadge';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { useFlowMatching } from '@/hooks/useFlowMatching';
import { supabase } from '@/lib/supabase/client';
import { getAllUserCheckinStatuses } from '@/lib/api/checkin';
import { getUserSignedUpEvents } from '@/lib/api/signup';
import { upsertParticipantState } from '@/lib/api/participant-state';
import { toast } from 'sonner';

import CheckinCardWallet from '@/components/checkin/CheckinCardWallet';
import ActiveStepCard from '@/components/workflow/flow-control/ActiveStepCard';
import FlowStepCardReadOnly from '@/components/workflow/flow-control/FlowStepCardReadOnly';
import MatchingStepCard from '@/components/workflow/flow-control/MatchingStepCard';
import GroupMatchingStepCard from '@/components/workflow/flow-control/GroupMatchingStepCard';
import { FlowStepSkeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { Event } from '@/types/domain';

function formatEventTime(startStr: string, endStr: string, locale: string): string {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();
  const datePart = start.toLocaleDateString(loc, dateOpts);
  const startTime = start.toLocaleTimeString(loc, timeOpts);
  const endTime = end.toLocaleTimeString(loc, timeOpts);
  if (sameDay) return `${datePart}  ${startTime} - ${endTime}`;
  return `${datePart} ${startTime} - ${end.toLocaleDateString(loc, dateOpts)} ${endTime}`;
}

export default function UserFlowPage() {
  const { t, locale } = useTranslation();
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [checkinChecked, setCheckinChecked] = useState(false);
  const [showCheckinCards, setShowCheckinCards] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showBadge, setShowBadge] = useState(false);
  const [signedUpEvents, setSignedUpEvents] = useState<Event[]>([]);
  const [checkedInMap, setCheckedInMap] = useState<Map<string, boolean>>(new Map());
  // Manual override: once user confirms success dialog, force show flow
  const [forceShowFlow, setForceShowFlow] = useState(false);

  // Checkin success dialog
  const [showCheckinSuccess, setShowCheckinSuccess] = useState(false);
  const prevCheckedInRef = useRef(false);

  // Leave/pause state
  const [isOnLeave, setIsOnLeave] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const {
    loading,
    events: allEvents,
    selectedEventId,
    setSelectedEventId,
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

  // Current event info
  const currentEvent = useMemo(
    () => allEvents.find((e) => e.event_id === selectedEventId) ?? null,
    [allEvents, selectedEventId]
  );

  // Derive checkin status from checkedInMap — covers both selectedEventId and any signed-up event
  const isCheckedIn = useMemo(() => {
    if (forceShowFlow) return true;
    if (!selectedEventId) return false;
    // Check selectedEventId first
    if (checkedInMap.get(selectedEventId)) return true;
    // Also check any signed-up event (user may have checked in for a different event)
    for (const [, checked] of checkedInMap) {
      if (checked) return true;
    }
    return false;
  }, [checkedInMap, selectedEventId, forceShowFlow]);

  const completedCount = useMemo(
    () => flowState?.steps.filter((s) => s.status === 'completed').length ?? 0,
    [flowState?.steps]
  );
  const totalCount = flowState?.steps.length ?? 0;
  const nextPendingStep = useMemo(
    () => flowState?.steps.find((s) => s.status === 'pending'),
    [flowState?.steps]
  );

  // Check checkin status and fetch event data
  useEffect(() => {
    if (!selectedEventId) return;
    let cancelled = false;

    const checkCheckin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        setCurrentUserId(user.id);
        const [allEvents, allStatuses] = await Promise.all([
          getUserSignedUpEvents(user.id),
          getAllUserCheckinStatuses(user.id),
        ]);
        if (!cancelled) {
          prevCheckedInRef.current = allStatuses.get(selectedEventId) || false;
          setCheckedInMap(allStatuses);
          setCheckinChecked(true);

          const now = Date.now();
          const sorted = [...allEvents].sort((a, b) => {
            const diffA = Math.abs(new Date(a.start_time).getTime() - now);
            const diffB = Math.abs(new Date(b.start_time).getTime() - now);
            return diffA - diffB;
          });
          setSignedUpEvents(sorted);
        }
      } catch {
        if (!cancelled) setCheckinChecked(true);
      }
    };

    checkCheckin();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  // Realtime sync: subscribe to checkin status changes
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('flow-checkin-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'evt_signups',
        filter: `user_id=eq.${currentUserId}`,
      }, () => {
        getAllUserCheckinStatuses(currentUserId).then(setCheckedInMap);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [currentUserId]);

  // Auto-switch to a checked-in event if current selection is not checked in
  useEffect(() => {
    if (!checkinChecked || !selectedEventId) return;
    if (checkedInMap.get(selectedEventId)) return;
    for (const evt of signedUpEvents) {
      if (checkedInMap.get(evt.event_id)) {
        setSelectedEventId(evt.event_id);
        break;
      }
    }
  }, [checkinChecked, selectedEventId, checkedInMap, signedUpEvents, setSelectedEventId]);

  // Watch checkedInMap changes to detect new checkin
  useEffect(() => {
    if (!selectedEventId || !checkinChecked) return;
    const nowCheckedIn = checkedInMap.get(selectedEventId) || false;
    if (nowCheckedIn && !prevCheckedInRef.current) {
      setShowCheckinSuccess(true);
    }
    prevCheckedInRef.current = nowCheckedIn;
  }, [checkedInMap, selectedEventId, checkinChecked]);

  const handleEnterFlow = () => {
    setShowCheckinSuccess(false);
    setForceShowFlow(true);
    setShowCheckinCards(false);
  };

  const handleLeave = async () => {
    setShowLeaveDialog(false);
    if (!selectedEventId || !currentUserId) return;
    try {
      await upsertParticipantState(selectedEventId, currentUserId, {
        participant_status: 'waiting',
        is_online: false,
      });
      setIsOnLeave(true);
      toast.success(t('userFlow.onLeave'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleRejoin = async () => {
    if (!selectedEventId || !currentUserId) return;
    try {
      await upsertParticipantState(selectedEventId, currentUserId, {
        is_online: true,
      });
      setIsOnLeave(false);
      toast.success(t('userFlow.rejoin'));
    } catch {
      toast.error(t('common.error'));
    }
  };

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
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <ListChecks className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
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

  // Not checked in: show checkin-only view
  if (checkinChecked && !isCheckedIn) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative">
        {/* Brand glow */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />

        <div className="max-w-4xl mx-auto relative">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2.5 mb-1">
              <ListChecks className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">
                {t('userFlow.title')}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">{t('userFlow.description')}</p>
          </div>

          {/* Checkin info banner */}
          <div className="w-full flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 mb-4">
            <TicketCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-sm font-medium text-amber-800 flex-1">
              {t('userFlow.checkinBanner')}
            </span>
          </div>

          {/* Horizontal checkin cards */}
          {showCheckinCards && currentUserId && signedUpEvents.length > 0 && (
            <div className="mb-4">
              <CheckinCardWallet
                events={signedUpEvents}
                userId={currentUserId}
                checkedInMap={checkedInMap}
              />
            </div>
          )}

          {/* Placeholder for flow content */}
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <ListChecks className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">{t('userFlow.notCheckedInHint')}</p>
          </div>
        </div>

        {/* Checkin success dialog */}
        <AlertDialog open={showCheckinSuccess} onOpenChange={setShowCheckinSuccess}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('userFlow.checkinSuccessTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('userFlow.checkinSuccessDesc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleEnterFlow}>
                {t('userFlow.enterFlow')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Checked in: show flow content
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
        {/* Header with status + leave button */}
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <ListChecks className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">
              {t('userFlow.title')}
            </h1>
            <div className="ml-auto flex items-center gap-2">
              {checkinChecked && isCheckedIn && !isOnLeave && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <TicketCheck className="w-3.5 h-3.5" />
                  {t('userFlow.checkedIn')}
                </span>
              )}
              {isOnLeave ? (
                <button
                  onClick={handleRejoin}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity touch-feedback"
                >
                  {t('userFlow.rejoin')}
                </button>
              ) : (
                <button
                  onClick={() => setShowLeaveDialog(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-muted-foreground text-xs font-medium hover:bg-muted transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  {t('userFlow.leaveActivity')}
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t('userFlow.description')}</p>
        </div>

        {/* Current event info */}
        {currentEvent && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-foreground truncate">{currentEvent.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatEventTime(currentEvent.start_time, currentEvent.end_time, locale)}
                </span>
                {currentEvent.venue?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {currentEvent.venue.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* On-leave banner */}
        {isOnLeave && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/50 mb-4">
            <PauseCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">{t('userFlow.onLeaveHint')}</span>
            <button
              onClick={handleRejoin}
              className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium hover:opacity-90 transition-opacity touch-feedback shrink-0"
            >
              {t('userFlow.rejoin')}
            </button>
          </div>
        )}

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
              <ListChecks className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-medium">{t('userFlow.noActiveFlow')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('userFlow.waitingHint')}</p>
          </div>
        ) : (
          <>
            {flowState.templateName && (
              <div className="mb-3 text-sm text-muted-foreground">
                {t('userFlow.templateName')}: {flowState.templateName}
              </div>
            )}

            <div className="mb-4">
              <ActiveStepCard
                title={activeStep?.title}
                remainingSeconds={activeStep?.remainingSeconds}
                status={activeStep?.status as 'active' | 'paused' | undefined}
                formatTime={formatTime}
                completedCount={completedCount}
                totalCount={totalCount}
                nextStepTitle={nextPendingStep?.title}
                flowCompleted={flowState.flowStatus === 'completed'}
              />
            </div>

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
          </>
        )}
      </div>

      {/* Fullscreen badge FAB */}
      {checkinChecked && isCheckedIn && currentUserId && !isOnLeave && (
        <button
          onClick={() => setShowBadge(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-full shadow-lg hover:opacity-90 transition-opacity touch-feedback"
        >
          <BadgeCheck className="w-5 h-5" />
          <span className="font-medium text-sm">{t('userFlow.showBadge')}</span>
        </button>
      )}

      {/* Fullscreen badge overlay */}
      {currentUserId && (
        <FullscreenBadge
          userId={currentUserId}
          open={showBadge}
          onClose={() => setShowBadge(false)}
        />
      )}

      {/* Leave confirmation dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('userFlow.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('userFlow.leaveConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('userFlow.leaveCancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave}>
              {t('userFlow.leaveConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
