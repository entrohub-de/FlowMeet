'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks, PauseCircle, PlayCircle, StopCircle, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event, ActiveFlowStep } from '@/types/domain';
import {
  resolveWorkflow,
  type WorkflowModule,
} from '@/features/host-console/workflowModules';
import { getAllWorkflowModules } from '@/lib/api/workflow-modules';
import {
  getAllWorkflowTemplates,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';
import { getActiveFlow, upsertActiveFlow } from '@/lib/api/active-flows';

import { broadcastFlowUpdate, broadcastGlobalPause, broadcastGlobalResume, broadcastPermissionChange } from '@/lib/realtime/flow-broadcast';
// Phase 1: template selection UI hidden
// import TemplateSelectionPanel from '@/components/workflow/flow-control/TemplateSelectionPanel';
// import TemplateSummaryBar from '@/components/workflow/flow-control/TemplateSummaryBar';
import FlowStepCard from '@/components/workflow/flow-control/FlowStepCard';
import PermissionPanel from '@/components/workflow/flow-control/PermissionPanel';
import { useHostFlowMatching } from '@/hooks/useHostFlowMatching';
import { useHostFlowGroupMatching } from '@/hooks/useHostFlowGroupMatching';
import { useAutoMatching } from '@/hooks/useAutoMatching';
import { logHostAction } from '@/lib/api/host-actions';
import { FlowStepSkeleton } from '@/components/ui/skeleton';
import type { ActiveFlowPermissions } from '@/types/domain';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

interface FlowStep {
  id: string;
  title: string;
  duration: number;
  status: FlowStatus;
  remainingSeconds: number;
  pairingMode?: 'group' | '1v1';
}

export default function FlowControlPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<WorkflowModule[]>([]);

  // Template selection stage
  const [templates, setTemplates] = useState<WorkflowTemplateRecord[]>([]);
  const [, setSelectedTemplateId] = useState<string>('');
  // Phase 1: template UI state unused but kept for future restoration
  const [, setLoadingTemplates] = useState(false);
  // const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Flow execution stage
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  // Action history panel toggle

  // Global pause state (Workstream D)
  const [isGloballyPaused, setIsGloballyPaused] = useState(false);

  // End event confirmation
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Permission model state
  const [permissions, setPermissions] = useState<ActiveFlowPermissions>({
    matching_1v1_enabled: false,
    matching_group_enabled: false,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [eventsData, modulesData] = await Promise.all([
          getEvents(),
          getAllWorkflowModules(),
        ]);
        const activeEvents = eventsData.filter((e) => e.status === 'active');
        setEvents(activeEvents);
        setModules(modulesData);
        if (activeEvents.length > 0) {
          setSelectedEventId(activeEvents[0].event_id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Fetch all templates and auto-apply the first one
  useEffect(() => {
    let cancelled = false;
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const data = await getAllWorkflowTemplates();
        if (!cancelled) {
          setTemplates(data);
          if (data.length > 0) {
            setSelectedTemplateId(data[0].template_id);
          }
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    };

    fetchTemplates();
    return () => { cancelled = true; };
  }, []);

  // Restore active flow from DB on event change
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedEventId || restoredRef.current === selectedEventId) return;
    let cancelled = false;

    const restore = async () => {
      try {
        const activeFlow = await getActiveFlow(selectedEventId);
        if (cancelled) return;

        if (!activeFlow || activeFlow.flow_status === 'idle') {
          // No active flow – reset steps so auto-apply can kick in
          setFlowSteps([]);
          setIsGloballyPaused(false);
          setPermissions({ matching_1v1_enabled: false, matching_group_enabled: false });
          autoApplied.current = false;
          return;
        }

        // Restore flow steps from DB
        const dbSteps = activeFlow.steps as ActiveFlowStep[];
        if (dbSteps.length > 0) {
          // Recompute remaining seconds for active step based on time elapsed
          const restored: FlowStep[] = dbSteps.map((step) => {
            if (
              step.status === 'active' &&
              activeFlow.active_step_started_at &&
              activeFlow.active_step_remaining_seconds != null
            ) {
              const elapsed = Math.floor(
                (Date.now() - new Date(activeFlow.active_step_started_at).getTime()) / 1000
              );
              return {
                ...step,
                remainingSeconds: activeFlow.active_step_remaining_seconds - elapsed,
              };
            }
            return step;
          });
          setFlowSteps(restored);
          if (activeFlow.template_id) {
            setSelectedTemplateId(activeFlow.template_id);
          }
          // Restore global pause state
          setIsGloballyPaused(!!activeFlow.is_globally_paused);
          // Restore permissions
          if (activeFlow.permissions) {
            setPermissions(activeFlow.permissions);
          }
        }
        restoredRef.current = selectedEventId;
      } catch (error) {
        console.error('Failed to restore active flow:', error);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  // Build flow steps from a template (by id)
  const applyTemplate = useCallback(
    async (templateId: string) => {
      const template = templates.find((tpl) => tpl.template_id === templateId);
      if (!template) return;

      const resolved = resolveWorkflow(template.steps, modules);
      const nextSteps: FlowStep[] = resolved.map((step) => {
        const mod = modules.find((m) => m.id === step.moduleId);
        return {
          id: step.stepId,
          title: step.title,
          duration: step.durationMinutes,
          status: 'pending' as FlowStatus,
          remainingSeconds: step.durationMinutes * 60,
          pairingMode: mod?.definition?.pairingMode,
        };
      });

      setFlowSteps(nextSteps);
      setSelectedTemplateId(templateId);

      // Persist + broadcast
      if (selectedEventId) {
        const now = new Date().toISOString();
        try {
          await upsertActiveFlow(selectedEventId, {
            template_id: templateId,
            template_name: template.name,
            flow_status: 'idle',
            steps: nextSteps,
            active_step_id: null,
            active_step_started_at: null,
            active_step_remaining_seconds: null,
            started_at: null,
            completed_at: null,
          });
          broadcastFlowUpdate(selectedEventId, 'flow_applied', {
            flowStatus: 'idle',
            templateId,
            templateName: template.name,
            steps: nextSteps,
            activeStepId: null,
            activeStepStartedAt: null,
            activeStepRemainingSeconds: null,
            timestamp: now,
          });
          logHostAction(selectedEventId, 'flow_applied', { templateName: template.name, templateId });
        } catch (error) {
          console.error('Failed to persist flow:', error);
        }
      }
    },
    [templates, modules, selectedEventId]
  );

  // Auto-apply first template once templates and modules are loaded (only if no restored flow)
  const autoApplied = useRef(false);
  useEffect(() => {
    if (!autoApplied.current && !restoredRef.current && templates.length > 0 && modules.length > 0 && flowSteps.length === 0) {
      autoApplied.current = true;
      applyTemplate(templates[0].template_id);
    }
  }, [templates, modules, flowSteps.length, applyTemplate]);

  // Phase 1: template modal confirm hidden
  // const handleConfirm = () => {
  //   applyTemplate(selectedTemplateId);
  //   setShowTemplateSelector(false);
  // };

  const handleStepStatusChange = async (stepId: string, newStatus: FlowStatus) => {
    // Compute new steps from current flowSteps
    let updatedSteps: FlowStep[];
    if (newStatus !== 'active') {
      updatedSteps = flowSteps.map((step) =>
        step.id === stepId ? { ...step, status: newStatus } : step
      );
    } else {
      updatedSteps = flowSteps.map((step) => {
        if (step.id === stepId) return { ...step, status: 'active' as FlowStatus };
        if (step.status === 'active') return { ...step, status: 'paused' as FlowStatus };
        return step;
      });
    }

    setFlowSteps(updatedSteps);

    // Persist + broadcast
    if (selectedEventId) {
      const now = new Date().toISOString();
      const newActiveStep = updatedSteps.find((s) => s.status === 'active');
      const allCompleted = updatedSteps.every((s) => s.status === 'completed');
      const hasPaused = updatedSteps.some((s) => s.status === 'paused');
      const flowStatus = newActiveStep ? 'running' : allCompleted ? 'completed' : hasPaused ? 'paused' : 'idle';

      // Set started_at when flow first transitions to running
      const isFirstStart = flowStatus === 'running' && flowSteps.every((s) => s.status === 'pending');

      try {
        await upsertActiveFlow(selectedEventId, {
          flow_status: flowStatus,
          steps: updatedSteps,
          active_step_id: newActiveStep?.id ?? null,
          active_step_started_at: newActiveStep ? now : null,
          active_step_remaining_seconds: newActiveStep?.remainingSeconds ?? null,
          ...(isFirstStart ? { started_at: now } : {}),
          completed_at: allCompleted ? now : null,
        });
        broadcastFlowUpdate(selectedEventId, 'step_changed', {
          flowStatus,
          steps: updatedSteps,
          activeStepId: newActiveStep?.id ?? null,
          activeStepStartedAt: newActiveStep ? now : null,
          activeStepRemainingSeconds: newActiveStep?.remainingSeconds ?? null,
          changedStepId: stepId,
          changedStepNewStatus: newStatus,
          timestamp: now,
        });

        // Log step status change
        const stepTitle = updatedSteps.find((s) => s.id === stepId)?.title;
        const prevStatus = flowSteps.find((s) => s.id === stepId)?.status;
        let actionType: 'step_started' | 'step_paused' | 'step_resumed' | 'step_completed' | null = null;
        if (newStatus === 'active') {
          actionType = prevStatus === 'paused' ? 'step_resumed' : 'step_started';
        } else if (newStatus === 'paused') {
          actionType = 'step_paused';
        } else if (newStatus === 'completed') {
          actionType = 'step_completed';
        }
        if (actionType) {
          logHostAction(selectedEventId, actionType, { stepTitle }, stepId);
        }

        // Log flow-level events
        if (allCompleted) {
          logHostAction(selectedEventId, 'flow_completed');
        }
      } catch (error) {
        console.error('Failed to persist step change:', error);
      }
    }
  };

  // Countdown timer for active step
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const hasActive = flowSteps.some((s) => s.status === 'active');
    if (!hasActive) return;

    timerRef.current = setInterval(() => {
      setFlowSteps((prev) => {
        const updated = prev.map((step) =>
          step.status === 'active'
            ? { ...step, remainingSeconds: step.remainingSeconds - 1 }
            : step
        );
        // Auto-advance: complete timer-only steps (no pairingMode) when they reach 0
        const expiredStep = updated.find(
          (s) => s.status === 'active' && s.remainingSeconds <= 0 && !s.pairingMode
        );
        if (expiredStep) {
          handleStepStatusChange(expiredStep.id, 'completed');
        }
        return updated;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowSteps.map((s) => `${s.id}:${s.status}`).join(',')]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(Math.abs(totalSeconds) / 60);
    const secs = Math.abs(totalSeconds) % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const activeStep = useMemo(() => flowSteps.find((s) => s.status === 'active' || s.status === 'paused'), [flowSteps]);
  const totalDuration = useMemo(
    () => flowSteps.reduce((sum, step) => sum + step.duration, 0),
    [flowSteps]
  );

  const activeStepForMatching = flowSteps.find((s) => s.status === 'active' || s.status === 'paused');
  const { matchingState, triggerMatching, isMatching, matchingError, matchQuality } = useHostFlowMatching(
    selectedEventId,
    activeStepForMatching?.pairingMode as ('group' | '1v1' | undefined),
    !!activeStepForMatching
  );

  const {
    readyCount: groupReadyCount,
    totalPresent: groupTotalPresent,
    groupedCount,
    isGrouping,
    triggerGrouping,
  } = useHostFlowGroupMatching(
    selectedEventId,
    activeStepForMatching?.id ?? null,
    activeStepForMatching?.pairingMode
  );

  // Auto-matching engine (permission model)
  const { stats: autoMatchingStats, error: autoMatchingError, triggerManualRound } = useAutoMatching(
    selectedEventId,
    permissions.matching_1v1_enabled
  );

  // Permission toggle handler
  const handleTogglePermission = useCallback(async (key: 'matching_1v1_enabled' | 'matching_group_enabled') => {
    if (!selectedEventId) return;
    const newPermissions = { ...permissions, [key]: !permissions[key] };
    setPermissions(newPermissions);
    try {
      await upsertActiveFlow(selectedEventId, { permissions: newPermissions });
      broadcastPermissionChange(selectedEventId, newPermissions, key);
      logHostAction(selectedEventId, newPermissions[key] ? 'permission_enabled' : 'permission_disabled', { key });
    } catch (error) {
      console.error('Failed to toggle permission:', error);
      setPermissions(permissions); // rollback
    }
  }, [selectedEventId, permissions]);

  // Global pause/resume handler (Workstream D)
  const handleToggleGlobalPause = useCallback(async () => {
    if (!selectedEventId) return;
    const newPaused = !isGloballyPaused;
    setIsGloballyPaused(newPaused);
    try {
      await upsertActiveFlow(selectedEventId, {
        is_globally_paused: newPaused,
        global_pause_message: null,
      });
      if (newPaused) {
        broadcastGlobalPause(selectedEventId);
      } else {
        broadcastGlobalResume(selectedEventId);
      }
    } catch (error) {
      console.error('Failed to toggle global pause:', error);
      setIsGloballyPaused(!newPaused);
    }
  }, [selectedEventId, isGloballyPaused]);

  // End event handler: mark all steps completed and broadcast
  const handleEndEvent = useCallback(async () => {
    if (!selectedEventId) return;
    const now = new Date().toISOString();
    const completedSteps = flowSteps.map((step) => ({
      ...step,
      status: 'completed' as FlowStatus,
    }));
    setFlowSteps(completedSteps);
    setShowEndConfirm(false);

    try {
      await upsertActiveFlow(selectedEventId, {
        flow_status: 'completed',
        steps: completedSteps,
        active_step_id: null,
        active_step_started_at: null,
        active_step_remaining_seconds: null,
        completed_at: now,
      });
      broadcastFlowUpdate(selectedEventId, 'step_changed', {
        flowStatus: 'completed',
        steps: completedSteps,
        activeStepId: null,
        activeStepStartedAt: null,
        activeStepRemainingSeconds: null,
        timestamp: now,
      });
      logHostAction(selectedEventId, 'flow_completed', { endedManually: true });
    } catch (error) {
      console.error('Failed to end event:', error);
    }
  }, [selectedEventId, flowSteps]);

  // Adjust time for an active/paused step (deltaSeconds can be positive or negative)
  const handleAdjustTime = useCallback(async (stepId: string, deltaSeconds: number) => {
    const updatedSteps = flowSteps.map((step) => {
      if (step.id !== stepId) return step;
      const newRemaining = Math.max(0, step.remainingSeconds + deltaSeconds);
      const newDuration = Math.max(1, step.duration + deltaSeconds / 60);
      return { ...step, remainingSeconds: newRemaining, duration: newDuration };
    });

    setFlowSteps(updatedSteps);

    if (selectedEventId) {
      const now = new Date().toISOString();
      const adjustedStep = updatedSteps.find((s) => s.id === stepId);

      try {
        await upsertActiveFlow(selectedEventId, {
          steps: updatedSteps,
          active_step_remaining_seconds: adjustedStep?.remainingSeconds ?? null,
        });
        broadcastFlowUpdate(selectedEventId, 'step_changed', {
          flowStatus: 'running',
          steps: updatedSteps,
          activeStepId: adjustedStep?.id ?? null,
          activeStepStartedAt: now,
          activeStepRemainingSeconds: adjustedStep?.remainingSeconds ?? null,
          timestamp: now,
        });
        logHostAction(selectedEventId, 'time_adjusted', {
          stepTitle: adjustedStep?.title,
          deltaSeconds,
          newRemainingSeconds: adjustedStep?.remainingSeconds,
        }, stepId);
      } catch (error) {
        console.error('Failed to persist time adjustment:', error);
      }
    }
  }, [flowSteps, selectedEventId]);

  // Handle event switch: reset flow state so restore effect re-runs
  const handleEventChange = useCallback((eventId: string) => {
    if (eventId === selectedEventId) return;
    setSelectedEventId(eventId);
    setFlowSteps([]);
    setIsGloballyPaused(false);
    setPermissions({ matching_1v1_enabled: false, matching_group_enabled: false });
    restoredRef.current = null;
    autoApplied.current = false;
  }, [selectedEventId]);

  // Event dropdown state
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setShowEventDropdown(false);
      }
    };
    if (showEventDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEventDropdown]);

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);
  // Phase 1: selectedTemplate unused with template UI hidden
  // const selectedTemplate = templates.find((tpl) => tpl.template_id === selectedTemplateId);

  // Auto-scroll to active step
  const activeStepRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeStep && activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeStep?.id]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-3">
            <FlowStepSkeleton />
            <FlowStepSkeleton />
            <FlowStepSkeleton />
            <FlowStepSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          {/* ── Event Selector Dropdown ── */}
          {events.length > 1 && (
            <div ref={eventDropdownRef} className="relative mb-1">
              <button
                type="button"
                onClick={() => setShowEventDropdown((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <span className="truncate">
                  {selectedEvent?.name ?? t('host.flowControl.selectEvent')}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showEventDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showEventDropdown && (
                <div className="absolute left-0 z-50 mt-1 min-w-[260px] bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
                  {events.map((event) => {
                    const isSelected = event.event_id === selectedEventId;
                    return (
                      <button
                        key={event.event_id}
                        type="button"
                        onClick={() => { handleEventChange(event.event_id); setShowEventDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {event.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>



        {/* ── Permission Panel ── */}
        {selectedEventId && (
          <div className="mb-4">
            <PermissionPanel
              permissions={permissions}
              onTogglePermission={handleTogglePermission}
              autoMatchingStats={autoMatchingStats}
              autoMatchingError={autoMatchingError}
              onTriggerManualRound={triggerManualRound}
              onlineCount={autoMatchingStats.totalPresent}
              conversationCount={matchingState.pairedCount}
              idleCount={Math.max(0, autoMatchingStats.totalPresent - matchingState.pairedCount)}
            />
          </div>
        )}

        {/* Phase 1: Template selection UI hidden (A+C model - uses default template automatically) */}
        {/* <TemplateSummaryBar
          templateName={selectedTemplate?.name}
          onChangeTemplate={() => setShowTemplateSelector(true)}
        /> */}

        {/* <TemplateSelectionPanel modal hidden - auto-applies first template */ }

        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4">
            {flowSteps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
                {t('host.flowControl.emptyFlow')}
              </div>
            ) : (
              <div className="space-y-2">
                {flowSteps.filter(step => step.pairingMode === '1v1' || step.pairingMode === 'group').map((step, index) => (
                  <div
                    key={step.id}
                    ref={(step.status === 'active' || step.status === 'paused') ? activeStepRef : undefined}
                  >
                  <FlowStepCard
                    id={step.id}
                    index={index}
                    title={step.title}
                    duration={step.duration}
                    status={step.status}
                    remainingSeconds={step.remainingSeconds}
                    formatTime={formatTime}
                    onStatusChange={handleStepStatusChange}
                    pairingMode={step.pairingMode}
                    matchingReadyCount={step.id === activeStepForMatching?.id ? matchingState.readyCount : undefined}
                    matchingTotalCount={step.id === activeStepForMatching?.id ? matchingState.totalPresent : undefined}
                    matchingPairedCount={step.id === activeStepForMatching?.id ? matchingState.pairedCount : undefined}
                    onTriggerMatching={triggerMatching}
                    isMatching={isMatching}
                    matchingError={step.id === activeStepForMatching?.id ? matchingError : undefined}
                    groupReadyCount={step.id === activeStepForMatching?.id ? groupReadyCount : undefined}
                    groupTotalCount={step.id === activeStepForMatching?.id ? groupTotalPresent : undefined}
                    groupedCount={step.id === activeStepForMatching?.id ? groupedCount : undefined}
                    onTriggerGrouping={triggerGrouping}
                    isGrouping={isGrouping}
                    matchQuality={step.id === activeStepForMatching?.id ? matchQuality : undefined}
                    onAdjustTime={handleAdjustTime}
                  />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
