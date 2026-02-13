'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import {
  resolveWorkflow,
  type WorkflowModule,
} from '@/features/host-console/workflowModules';
import { getAllWorkflowModules } from '@/lib/api/workflow-modules';
import {
  getAllWorkflowTemplates,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';
import TemplateSelectionPanel from '@/components/workflow/flow-control/TemplateSelectionPanel';
import TemplateSummaryBar from '@/components/workflow/flow-control/TemplateSummaryBar';
import FlowStatusCards from '@/components/workflow/flow-control/FlowStatusCards';
import FlowStepCard from '@/components/workflow/flow-control/FlowStepCard';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

interface FlowStep {
  id: string;
  title: string;
  duration: number;
  status: FlowStatus;
  remainingSeconds: number;
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
  const [confirmed, setConfirmed] = useState(false);

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

  // Fetch all templates (templates are shared across events)
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

  // Build flow steps from confirmed template
  const handleConfirm = () => {
    const template = templates.find((tpl) => tpl.template_id === selectedTemplateId);
    if (!template) return;

    const resolved = resolveWorkflow(template.steps, modules);
    const nextSteps: FlowStep[] = resolved.map((step) => ({
      id: step.stepId,
      title: step.title,
      duration: step.durationMinutes,
      status: 'pending',
      remainingSeconds: step.durationMinutes * 60,
    }));

    if (nextSteps[0]) {
      nextSteps[0].status = 'active';
    }

    setFlowSteps(nextSteps);
    setConfirmed(true);
  };

  const handleBack = () => {
    setConfirmed(false);
    setFlowSteps([]);
  };

  const handleStepStatusChange = (stepId: string, newStatus: FlowStatus) => {
    setFlowSteps((prev) => {
      if (newStatus !== 'active') {
        return prev.map((step) => (step.id === stepId ? { ...step, status: newStatus } : step));
      }

      return prev.map((step) => {
        if (step.id === stepId) {
          return { ...step, status: 'active' };
        }
        if (step.status === 'active') {
          return { ...step, status: 'paused' };
        }
        return step;
      });
    });
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
          step.status === 'active' && step.remainingSeconds > 0
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

        {/* ── Template Selection / Summary ── */}
        {confirmed ? (
          <TemplateSummaryBar
            templateName={selectedTemplate?.name}
            onChangeTemplate={handleBack}
          />
        ) : (
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
          />
        )}

        {/* ── Execution Stage ── */}
        {confirmed && (
          <>
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
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
