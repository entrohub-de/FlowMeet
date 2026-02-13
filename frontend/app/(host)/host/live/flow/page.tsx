'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ListChecks, Clock, Play, Pause, CheckCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  resolveWorkflow,
  type WorkflowModule,
} from '@/features/host-console/workflowModules';
import { getAllWorkflowModules } from '@/lib/api/workflow-modules';
import {
  getAllWorkflowTemplates,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';

type FlowStatus = 'pending' | 'active' | 'completed';

interface FlowStep {
  id: string;
  title: string;
  duration: number;
  status: FlowStatus;
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
    const template = templates.find((t) => t.template_id === selectedTemplateId);
    if (!template) return;

    const resolved = resolveWorkflow(template.steps, modules);
    const nextSteps: FlowStep[] = resolved.map((step) => ({
      id: step.stepId,
      title: step.title,
      duration: step.durationMinutes,
      status: 'pending',
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
          return { ...step, status: 'pending' };
        }
        return step;
      });
    });
  };

  const activeStep = useMemo(() => flowSteps.find((s) => s.status === 'active'), [flowSteps]);
  const completedCount = useMemo(
    () => flowSteps.filter((s) => s.status === 'completed').length,
    [flowSteps]
  );
  const totalDuration = useMemo(
    () => flowSteps.reduce((sum, step) => sum + step.duration, 0),
    [flowSteps]
  );

  const selectedTemplate = templates.find((t) => t.template_id === selectedTemplateId);

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
            <h1 className="text-3xl font-bold text-foreground">流程控制</h1>
          </div>
        </div>

        {!confirmed ? (
          /* ── Selection Stage ── */
          <div className="bg-card border border-border rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6">选择流程模板</h2>

            <div className="space-y-5">
              {/* Event selector */}
              {events.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    选择活动
                  </label>
                  <CustomSelect
                    options={events.map((event) => ({
                      value: event.event_id,
                      label: event.name,
                    }))}
                    value={selectedEventId}
                    onChange={setSelectedEventId}
                    placeholder="选择活动"
                    className="w-full md:w-auto md:min-w-[300px]"
                  />
                </div>
              )}

              {/* Template selector */}
              {selectedEventId && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    选择模板
                  </label>
                  {loadingTemplates ? (
                    <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                  ) : templates.length > 0 ? (
                    <CustomSelect
                      options={templates.map((tpl) => ({
                        value: tpl.template_id,
                        label: tpl.name,
                      }))}
                      value={selectedTemplateId}
                      onChange={setSelectedTemplateId}
                      placeholder="选择模板"
                      className="w-full md:w-auto md:min-w-[300px]"
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      该活动暂无流程模板。
                      <Link href="/host/workflows" className="ml-1 text-primary hover:underline">
                        前往流程设置创建模板
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Template preview */}
              {selectedTemplate && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-3">模板预览</div>
                  <div className="space-y-2">
                    {resolveWorkflow(selectedTemplate.steps, modules).map((step, index) => (
                      <div key={step.stepId} className="flex items-center gap-3 text-sm">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-foreground">{step.title}</span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {step.durationMinutes}分钟
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                    共 {selectedTemplate.steps.length} 个环节，总时长{' '}
                    {selectedTemplate.steps.reduce((sum, s) => sum + s.durationMinutes, 0)} 分钟
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={!selectedTemplateId}
                  onClick={handleConfirm}
                  className="px-6 py-2.5 rounded-button bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认开始
                </button>
                {selectedEventId && (
                  <Link
                    href="/host/workflows"
                    className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    前往流程设置
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── Execution Stage ── */
          <>
            <div className="mb-6">
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                返回选择模板
              </button>
              <div className="text-sm text-muted-foreground">
                当前模板：<span className="font-medium text-foreground">{selectedTemplate?.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="text-sm text-muted-foreground mb-2">当前环节</div>
                <div className="text-xl font-bold text-primary">
                  {activeStep ? activeStep.title : '未开始'}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="text-sm text-muted-foreground mb-2">进度</div>
                <div className="text-3xl font-bold text-foreground">
                  {completedCount}/{flowSteps.length}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="text-sm text-muted-foreground mb-2">总时长</div>
                <div className="text-3xl font-bold text-foreground">{totalDuration}分钟</div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">活动流程</h2>
              </div>
              <div className="p-6">
                {flowSteps.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                    当前模板没有可执行流程。请先在流程设置中添加模块。
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flowSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`p-4 rounded-lg border transition-all ${
                          step.status === 'active'
                            ? 'border-primary bg-primary/5'
                            : step.status === 'completed'
                            ? 'border-green-200 bg-green-50/50'
                            : 'border-border bg-background'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                                step.status === 'active'
                                  ? 'bg-primary text-white'
                                  : step.status === 'completed'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {step.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{step.title}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{step.duration}分钟</span>
                                {step.status === 'active' && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                                    进行中
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {step.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleStepStatusChange(step.id, 'active')}
                                className="px-4 py-2 rounded-button bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-2"
                              >
                                <Play className="w-4 h-4" />
                                开始
                              </button>
                            )}
                            {step.status === 'active' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStepStatusChange(step.id, 'pending')}
                                  className="px-4 py-2 rounded-button border border-border hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                  <Pause className="w-4 h-4" />
                                  暂停
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStepStatusChange(step.id, 'completed')}
                                  className="px-4 py-2 rounded-button bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  完成
                                </button>
                              </>
                            )}
                            {step.status === 'completed' && (
                              <button
                                type="button"
                                onClick={() => handleStepStatusChange(step.id, 'pending')}
                                className="px-4 py-2 rounded-button bg-green-100 text-green-700 font-medium hover:bg-green-200 transition-colors"
                              >
                                已完成
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
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
