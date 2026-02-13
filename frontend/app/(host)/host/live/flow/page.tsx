'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks } from 'lucide-react';
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
import { broadcastFlowUpdate } from '@/lib/realtime/flow-broadcast';
import TemplateSelectionPanel from '@/components/workflow/flow-control/TemplateSelectionPanel';
import TemplateSummaryBar from '@/components/workflow/flow-control/TemplateSummaryBar';
import FlowStatusCards from '@/components/workflow/flow-control/FlowStatusCards';
import FlowStepCard from '@/components/workflow/flow-control/FlowStepCard';
import { useHostFlowMatching } from '@/hooks/useHostFlowMatching';
import { useHostFlowGroupMatching } from '@/hooks/useHostFlowGroupMatching';

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Flow execution stage
  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const [eventsData, modulesData] = await Promise.all([
          getEvents(),
          getAllWorkflowModules(),
        ]);
        setEvents(eventsData);
        setModules(modulesData);
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].event_id);
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
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!selectedEventId || restoredRef.current) return;
    let cancelled = false;

    const restore = async () => {
      try {
        const activeFlow = await getActiveFlow(selectedEventId);
        if (cancelled || !activeFlow || activeFlow.flow_status === 'idle') return;

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
          restoredRef.current = true;
        }
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

  // Confirm from modal
  const handleConfirm = () => {
    applyTemplate(selectedTemplateId);
    setShowTemplateSelector(false);
  };

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
      setFlowSteps((prev) =>
        prev.map((step) =>
          step.status === 'active'
            ? { ...step, remainingSeconds: step.remainingSeconds - 1 }
            : step
        )
      );
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
  const { matchingState, triggerMatching, isMatching, matchingError } = useHostFlowMatching(
    selectedEventId,
    activeStepForMatching?.id ?? null,
    activeStepForMatching?.pairingMode
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

  const selectedTemplate = templates.find((tpl) => tpl.template_id === selectedTemplateId);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <ListChecks className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              {t('host.flowControl.title')}
            </h1>
          </div>
        </div>

        {/* ── Template Summary Bar ── */}
        <TemplateSummaryBar
          templateName={selectedTemplate?.name}
          onChangeTemplate={() => setShowTemplateSelector(true)}
        />

        {/* ── Template Selection Modal ── */}
        {showTemplateSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg mx-4">
              <TemplateSelectionPanel
                events={events}
                selectedEventId={selectedEventId}
                onEventChange={setSelectedEventId}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateChange={setSelectedTemplateId}
                loadingTemplates={loadingTemplates}
                modules={modules}
                onConfirm={handleConfirm}
                onCancel={() => setShowTemplateSelector(false)}
              />
            </div>
          </div>
        )}

        {/* ── Execution Stage ── */}
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
            {flowSteps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                {t('host.flowControl.emptyFlow')}
              </div>
            ) : (
              <div className="space-y-3">
                {flowSteps.map((step, index) => (
                  <FlowStepCard
                    key={step.id}
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
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
