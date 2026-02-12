'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import {
  WORKFLOW_MODULE_LIBRARY,
  createStepFromModule,
  getDefaultWorkflowConfig,
  loadEventWorkflow,
  resolveWorkflow,
  saveEventWorkflow,
  type WorkflowStepConfig,
} from '@/features/host-console/workflowModules';
import CustomSelect from '@/components/ui/CustomSelect';
import { Plus, Save, ArrowUp, ArrowDown, Trash2, RotateCcw } from 'lucide-react';

export default function HostWorkflowsPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string>('');
  const [lastAddedTitle, setLastAddedTitle] = useState<string>('');

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].event_id);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    const existing = loadEventWorkflow(selectedEventId);
    setWorkflowConfig(existing ?? getDefaultWorkflowConfig());
  }, [selectedEventId]);

  const resolvedSteps = useMemo(
    () => resolveWorkflow(workflowConfig),
    [workflowConfig]
  );
  const totalDuration = useMemo(
    () => resolvedSteps.reduce((sum, step) => sum + step.durationMinutes, 0),
    [resolvedSteps]
  );

  const addModuleToWorkflow = (moduleId: string) => {
    const step = createStepFromModule(moduleId);
    if (!step) return;
    const selectedModule = WORKFLOW_MODULE_LIBRARY.find((item) => item.id === moduleId);
    setWorkflowConfig((prev) => [...prev, step]);
    setLastAddedTitle(selectedModule?.title ?? '');
  };

  const updateDuration = (stepId: string, duration: number) => {
    const safe = Number.isFinite(duration) ? Math.max(1, Math.round(duration)) : 1;
    setWorkflowConfig((prev) =>
      prev.map((step) => (step.stepId === stepId ? { ...step, durationMinutes: safe } : step))
    );
  };

  const removeStep = (stepId: string) => {
    setWorkflowConfig((prev) => prev.filter((step) => step.stepId !== stepId));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    setWorkflowConfig((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const resetToDefault = () => {
    setWorkflowConfig(getDefaultWorkflowConfig());
    setSavedAt('');
  };

  const saveWorkflow = () => {
    if (!selectedEventId || workflowConfig.length === 0) return;
    saveEventWorkflow(selectedEventId, workflowConfig);
    setSavedAt(new Date().toLocaleTimeString());
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
            {t('nav.host.workflowSettings')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            将流程拆成模块，自由组合为现场执行流程。
          </p>
        </div>

        {events.length > 0 && (
          <CustomSelect
            options={events.map((event) => ({ value: event.event_id, label: event.name }))}
            value={selectedEventId}
            onChange={setSelectedEventId}
            placeholder="选择活动"
            className="w-full lg:w-[360px]"
          />
        )}

        {!selectedEventId && (
          <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
            请先创建活动，再进行流程模块配置。
          </div>
        )}

        {selectedEventId && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">模块库</h2>
                <span className="text-xs text-muted-foreground">
                  共 {WORKFLOW_MODULE_LIBRARY.length} 个
                </span>
              </div>
              <div className="space-y-3 max-h-[560px] overflow-auto pr-1">
                {WORKFLOW_MODULE_LIBRARY.map((module) => (
                  <div key={module.id} className="rounded-lg border border-border p-4 bg-background">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-foreground">{module.title}</div>
                        <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                        <div className="text-xs text-muted-foreground mt-2">
                          默认时长: {module.durationMinutes} 分钟
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addModuleToWorkflow(module.id)}
                        className="inline-flex items-center gap-1 px-3 h-9 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">当前流程</h2>
                  <p className="text-sm text-muted-foreground">
                    {resolvedSteps.length} 个环节，预计 {totalDuration} 分钟
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetToDefault}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-button border border-border hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    恢复默认
                  </button>
                  <button
                    type="button"
                    onClick={saveWorkflow}
                    disabled={workflowConfig.length === 0}
                    className="inline-flex items-center gap-1 px-3 h-9 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    保存流程
                  </button>
                </div>
              </div>

              {savedAt && (
                <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                  已保存，时间: {savedAt}
                </p>
              )}
              {lastAddedTitle && (
                <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded px-3 py-2 mb-4">
                  已添加模块: {lastAddedTitle}
                </p>
              )}

              {resolvedSteps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  还没有流程环节，请从左侧模块库添加。
                </div>
              ) : (
                <div className="space-y-3">
                  {resolvedSteps.map((step, index) => (
                    <div
                      key={step.stepId}
                      className="rounded-lg border border-border p-4 bg-background"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">第 {index + 1} 步</p>
                          <div className="font-medium text-foreground">{step.title}</div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted disabled:opacity-50"
                            aria-label="上移"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === resolvedSteps.length - 1}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted disabled:opacity-50"
                            aria-label="下移"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(step.stepId)}
                            className="h-9 w-9 inline-flex items-center justify-center rounded-button border border-red-200 text-red-600 hover:bg-red-50"
                            aria-label="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <label
                          htmlFor={`duration-${step.stepId}`}
                          className="text-sm text-muted-foreground"
                        >
                          时长(分钟)
                        </label>
                        <input
                          id={`duration-${step.stepId}`}
                          type="number"
                          min={1}
                          value={step.durationMinutes}
                          onChange={(event) =>
                            updateDuration(step.stepId, Number(event.target.value))
                          }
                          className="h-9 w-24 rounded-button border border-border px-2 bg-background"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
