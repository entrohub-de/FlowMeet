'use client';

import { useEffect, useMemo, useState, type TouchEvent } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import {
  createWorkflowTemplate,
  deleteWorkflowTemplate as deleteWorkflowTemplateById,
  getWorkflowTemplates,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';
import {
  WORKFLOW_MODULE_LIBRARY,
  createStepFromModule,
  getDefaultWorkflowConfig,
  loadCustomWorkflowModules,
  loadEventWorkflow,
  resolveWorkflow,
  saveCustomWorkflowModules,
  type WorkflowModule,
  type WorkflowModuleCategory,
  type WorkflowStepConfig,
} from '@/features/host-console/workflowModules';
import { Plus, Save, ArrowUp, ArrowDown, Trash2, GripVertical, X } from 'lucide-react';

type ActiveTab = 'templates' | 'modules';

function cloneStepsWithNewIds(steps: WorkflowStepConfig[]): WorkflowStepConfig[] {
  return steps.map((step, index) => ({
    ...step,
    stepId: `${step.moduleId}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
  }));
}

export default function HostWorkflowsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ActiveTab>('templates');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [workflowConfig, setWorkflowConfig] = useState<WorkflowStepConfig[]>([]);
  const [customModules, setCustomModules] = useState<WorkflowModule[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplateRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [customError, setCustomError] = useState('');
  const [lastAction, setLastAction] = useState('');

  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [lastAddedStepId, setLastAddedStepId] = useState('');

  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customDuration, setCustomDuration] = useState<number>(15);
  const [customCategory, setCustomCategory] = useState<WorkflowModuleCategory>('networking');

  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  useEffect(() => {
    setCustomModules(loadCustomWorkflowModules());
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
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

  const availableModules = useMemo(
    () => [...WORKFLOW_MODULE_LIBRARY, ...customModules],
    [customModules]
  );

  useEffect(() => {
    if (!selectedEventId) return;

    const loadData = async () => {
      try {
        setTemplateLoading(true);
        const existing = loadEventWorkflow(selectedEventId);
        setWorkflowConfig(existing ?? getDefaultWorkflowConfig());

        const data = await getWorkflowTemplates(selectedEventId);
        setTemplates(data);
        setSelectedTemplateId((prev) =>
          data.some((item) => item.template_id === prev) ? prev : (data[0]?.template_id ?? '')
        );
        setTemplateError('');
      } catch (error) {
        console.error('Failed to load workflow templates:', error);
        setTemplateError(t('host.workflows.errors.loadTemplates'));
      } finally {
        setTemplateLoading(false);
      }
    };

    loadData();
  }, [selectedEventId, t]);

  const resolvedSteps = useMemo(
    () => resolveWorkflow(workflowConfig, availableModules),
    [workflowConfig, availableModules]
  );

  const totalDuration = useMemo(
    () => resolvedSteps.reduce((sum, step) => sum + step.durationMinutes, 0),
    [resolvedSteps]
  );

  useEffect(() => {
    if (!lastAddedStepId || activeTab !== 'templates') return;
    const el = window.document.getElementById(`step-${lastAddedStepId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setLastAddedStepId('');
  }, [lastAddedStepId, activeTab]);

  useEffect(() => {
    if (!isModulePickerOpen) setSelectedModuleId(null);
  }, [isModulePickerOpen]);

  const addModuleToWorkflow = (moduleId: string) => {
    const step = createStepFromModule(moduleId, availableModules);
    if (!step) return;

    const selected = availableModules.find((item) => item.id === moduleId);
    setWorkflowConfig((prev) => [...prev, step]);
    setLastAction(
      t('host.workflows.messages.addedModule', {
        title: selected?.title ?? t('host.workflows.messages.untitledModule'),
      })
    );
    setLastAddedStepId(step.stepId);
    setActiveTab('templates');
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

  const reorderByStepId = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setWorkflowConfig((prev) => {
      const from = prev.findIndex((step) => step.stepId === draggedId);
      const to = prev.findIndex((step) => step.stepId === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleTouchMoveOnStep = (event: TouchEvent<HTMLButtonElement>) => {
    if (!draggingStepId) return;
    const touch = event.touches[0];
    if (!touch) return;
    const target = window.document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const host = target?.closest('[data-step-id]') as HTMLElement | null;
    const targetStepId = host?.dataset?.stepId ?? null;
    if (targetStepId) {
      setDragOverStepId(targetStepId);
    }
    event.preventDefault();
  };

  const finishDrag = (targetId?: string) => {
    const dropTarget = targetId ?? dragOverStepId;
    if (draggingStepId && dropTarget && draggingStepId !== dropTarget) {
      reorderByStepId(draggingStepId, dropTarget);
    }
    setDraggingStepId(null);
    setDragOverStepId(null);
  };

  const createCustomModule = () => {
    const safeTitle = customTitle.trim();
    if (!safeTitle) {
      setCustomError(t('host.workflows.errors.enterModuleName'));
      return;
    }

    const safeDuration = Number.isFinite(customDuration)
      ? Math.max(1, Math.round(customDuration))
      : 1;

    const customItem: WorkflowModule = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: safeTitle,
      description: customDescription.trim() || t('host.workflows.messages.defaultCustomModuleDescription'),
      durationMinutes: safeDuration,
      category: customCategory,
    };

    setCustomModules((prev) => {
      const next = [customItem, ...prev];
      saveCustomWorkflowModules(next);
      return next;
    });

    setCustomTitle('');
    setCustomDescription('');
    setCustomDuration(15);
    setCustomCategory('networking');
    setCustomError('');
  };

  const removeCustomModule = (moduleId: string) => {
    setCustomModules((prev) => {
      const next = prev.filter((item) => item.id !== moduleId);
      saveCustomWorkflowModules(next);
      return next;
    });
  };

  const saveCurrentAsTemplate = async () => {
    if (!selectedEventId) return;
    if (workflowConfig.length === 0) {
      setTemplateError(t('host.workflows.errors.emptyWorkflow'));
      return;
    }

    const safeName = templateName.trim();
    if (!safeName) {
      setTemplateError(t('host.workflows.errors.enterTemplateName'));
      return;
    }

    try {
      const template = await createWorkflowTemplate(
        selectedEventId,
        safeName,
        cloneStepsWithNewIds(workflowConfig)
      );
      setTemplates((prev) => [template, ...prev]);
      setSelectedTemplateId(template.template_id);
      setTemplateName('');
      setTemplateError('');
    } catch (error) {
      console.error('Failed to save workflow template:', error);
      setTemplateError(t('host.workflows.errors.saveTemplate'));
    }
  };

  const applyTemplate = (templateId: string) => {
    const selected = templates.find((item) => item.template_id === templateId);
    if (!selected) return;
    setWorkflowConfig(cloneStepsWithNewIds(selected.steps));
    setLastAction(t('host.workflows.messages.appliedTemplate', { name: selected.name }));
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await deleteWorkflowTemplateById(templateId);
      setTemplates((prev) => {
        const next = prev.filter((item) => item.template_id !== templateId);
        setSelectedTemplateId((current) =>
          current === templateId ? (next[0]?.template_id ?? '') : current
        );
        return next;
      });
    } catch (error) {
      console.error('Failed to delete workflow template:', error);
      setTemplateError(t('host.workflows.errors.deleteTemplate'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (!selectedEventId) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">
          {t('host.workflows.messages.noEventHint')}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('host.workflows.tabs.templates')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('modules')}
              className={`h-10 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'modules'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t('host.workflows.tabs.modules')}
            </button>
          </div>
        </div>

        {activeTab === 'templates' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-3 space-y-3">
              <div className="text-sm font-medium text-foreground">
                {t('host.workflows.templates.sectionTitle')}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-2">
                <div className="text-xs text-muted-foreground">{t('host.workflows.templates.newTemplate')}</div>
                <input
                  type="text"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder={t('host.workflows.templates.inputPlaceholder')}
                  className="h-9 w-full rounded-button border border-border px-3 bg-background text-sm"
                />
                <button
                  type="button"
                  onClick={saveCurrentAsTemplate}
                  className="h-9 w-full inline-flex items-center justify-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                >
                  <Save className="w-4 h-4" />
                  {t('host.workflows.templates.saveCurrentAsTemplate')}
                </button>
              </div>

              {templateLoading && (
                <p className="text-xs text-muted-foreground">{t('host.workflows.templates.loading')}</p>
              )}
              {templateError && <p className="text-xs text-red-600">{templateError}</p>}

              {templates.length > 0 ? (
                <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
                  <div className="text-xs text-muted-foreground">{t('host.workflows.templates.selectTemplate')}</div>
                  <select
                    value={selectedTemplateId}
                    onChange={(event) => setSelectedTemplateId(event.target.value)}
                    className="h-9 w-full rounded-button border border-border px-3 bg-background text-sm"
                  >
                    {templates.map((item) => (
                      <option key={item.template_id} value={item.template_id}>
                        {t('host.workflows.templates.optionLabel', {
                          name: item.name,
                          count: item.steps.length,
                        })}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectedTemplateId && applyTemplate(selectedTemplateId)}
                      disabled={!selectedTemplateId}
                      className="h-8 flex-1 rounded-button border border-border hover:bg-muted text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('host.workflows.templates.apply')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedTemplateId) return;
                        const target = templates.find((t) => t.template_id === selectedTemplateId);
                        const ok = window.confirm(
                          t('host.workflows.templates.deleteConfirm', { name: target?.name ?? '' })
                        );
                        if (!ok) return;
                        deleteTemplate(selectedTemplateId);
                      }}
                      disabled={!selectedTemplateId}
                      className="h-8 px-3 inline-flex items-center gap-1 rounded-button border border-red-200 text-red-600 hover:bg-red-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('host.workflows.templates.deleteAria')}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('host.workflows.templates.delete')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {t('host.workflows.templates.empty')}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t('host.workflows.current.title')}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t('host.workflows.current.summary', {
                      count: resolvedSteps.length,
                      minutes: totalDuration,
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModulePickerOpen(true)}
                  className="h-9 px-3 inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  {t('host.workflows.current.addModule')}
                </button>
              </div>

              {lastAction && (
                <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded px-3 py-2 mb-3">
                  {t('host.workflows.messages.lastAction', { action: lastAction })}
                </p>
              )}

              {resolvedSteps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                  <p>{t('host.workflows.current.empty')}</p>
                  <button
                    type="button"
                    onClick={() => setIsModulePickerOpen(true)}
                    className="mt-3 h-9 px-3 inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                    {t('host.workflows.current.addModule')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {resolvedSteps.map((step, index) => (
                    <div
                      key={step.stepId}
                      id={`step-${step.stepId}`}
                      data-step-id={step.stepId}
                      draggable
                      onDragStart={() => setDraggingStepId(step.stepId)}
                      onDragOver={(event) => {
                        event.preventDefault();
                        if (dragOverStepId !== step.stepId) setDragOverStepId(step.stepId);
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        finishDrag(step.stepId);
                      }}
                      onDragEnd={() => finishDrag()}
                      className={`rounded-lg border p-3 bg-background ${
                        draggingStepId === step.stepId
                          ? 'border-primary/50 opacity-70'
                          : dragOverStepId === step.stepId
                          ? 'border-primary ring-1 ring-primary/40'
                          : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t('host.workflows.current.stepLabel', { index: index + 1 })}
                          </p>
                          <div className="font-medium text-foreground">{step.title}</div>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onTouchStart={() => {
                              setDraggingStepId(step.stepId);
                              setDragOverStepId(step.stepId);
                            }}
                            onTouchMove={handleTouchMoveOnStep}
                            onTouchEnd={() => finishDrag()}
                            onTouchCancel={() => finishDrag()}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border text-muted-foreground"
                            aria-label={t('host.workflows.current.dragAria')}
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted disabled:opacity-50"
                            aria-label={t('host.workflows.current.moveUpAria')}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === resolvedSteps.length - 1}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted disabled:opacity-50"
                            aria-label={t('host.workflows.current.moveDownAria')}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStep(step.stepId)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-red-200 text-red-600 hover:bg-red-50"
                            aria-label={t('host.workflows.current.deleteStepAria')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <label htmlFor={`duration-${step.stepId}`} className="text-xs text-muted-foreground">
                          {t('host.workflows.current.duration')}
                        </label>
                        <input
                          id={`duration-${step.stepId}`}
                          type="number"
                          min={1}
                          value={step.durationMinutes}
                          onChange={(event) => updateDuration(step.stepId, Number(event.target.value))}
                          className="h-8 w-20 rounded-button border border-border px-2 bg-background text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{t('host.workflows.current.minuteUnit')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'modules' && (
          <section className="space-y-4">
            <div className="rounded-xl border border-dashed border-border bg-card p-4 space-y-3">
              <div className="text-sm font-medium text-foreground">{t('host.workflows.custom.title')}</div>
              <input
                type="text"
                value={customTitle}
                onChange={(event) => setCustomTitle(event.target.value)}
                placeholder={t('host.workflows.custom.namePlaceholder')}
                className="h-10 w-full rounded-button border border-border px-3 bg-background"
              />
              <input
                type="number"
                min={1}
                value={customDuration}
                onChange={(event) => setCustomDuration(Number(event.target.value))}
                placeholder={t('host.workflows.custom.durationPlaceholder')}
                className="h-10 w-full rounded-button border border-border px-3 bg-background"
              />
              <textarea
                value={customDescription}
                onChange={(event) => setCustomDescription(event.target.value)}
                placeholder={t('host.workflows.custom.descriptionPlaceholder')}
                className="w-full min-h-[72px] rounded-button border border-border px-3 py-2 bg-background text-sm"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">{t('host.workflows.custom.category')}</span>
                <select
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value as WorkflowModuleCategory)}
                  className="h-10 flex-1 rounded-button border border-border px-2 bg-background"
                >
                  <option value="opening">{t('host.workflows.custom.categories.opening')}</option>
                  <option value="networking">{t('host.workflows.custom.categories.networking')}</option>
                  <option value="group">{t('host.workflows.custom.categories.group')}</option>
                  <option value="industry">{t('host.workflows.custom.categories.industry')}</option>
                  <option value="closing">{t('host.workflows.custom.categories.closing')}</option>
                </select>
              </div>
              <button
                type="button"
                onClick={createCustomModule}
                className="h-10 w-full inline-flex items-center justify-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('host.workflows.custom.save')}
              </button>
              {customError && <p className="text-xs text-red-600">{customError}</p>}
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">{t('host.workflows.custom.libraryTitle')}</h2>
                <span className="text-xs text-muted-foreground">
                  {t('host.workflows.custom.total', { count: availableModules.length })}
                </span>
              </div>
              <div className="space-y-3">
                {availableModules.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3 bg-background">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {item.title}
                          {item.id.startsWith('custom-') && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {t('host.workflows.custom.customBadge')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {t('host.workflows.custom.defaultDuration', {
                            minutes: item.durationMinutes,
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => addModuleToWorkflow(item.id)}
                          className="h-9 px-3 inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
                        >
                          <Plus className="w-4 h-4" />
                          {t('host.workflows.custom.add')}
                        </button>
                        {item.id.startsWith('custom-') && (
                          <button
                            type="button"
                            onClick={() => removeCustomModule(item.id)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-red-200 text-red-600 hover:bg-red-50"
                            aria-label={t('host.workflows.custom.deleteCustomAria')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>


      {isModulePickerOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[1px] p-4 flex items-end sm:items-center sm:justify-center">
          <div className="w-full sm:max-w-lg rounded-xl border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">{t('host.workflows.picker.title')}</h3>
              <button
                type="button"
                onClick={() => setIsModulePickerOpen(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted"
                aria-label={t('host.workflows.picker.closeAria')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-4 space-y-2">
              {availableModules.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedModuleId(item.id)}
                  className={`w-full text-left rounded-lg border bg-background p-3 transition-colors ${
                    selectedModuleId === item.id
                      ? 'border-primary ring-1 ring-primary/40 bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{item.title}</div>
                    <span className="text-xs text-muted-foreground">
                      {t('host.workflows.current.minutesLabel', { minutes: item.durationMinutes })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-border space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (!selectedModuleId) return;
                  addModuleToWorkflow(selectedModuleId);
                  setIsModulePickerOpen(false);
                }}
                disabled={!selectedModuleId}
                className="h-10 w-full rounded-button bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('host.workflows.picker.confirmAdd')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModulePickerOpen(false);
                  setActiveTab('modules');
                }}
                className="h-10 w-full rounded-button border border-border hover:bg-muted text-sm font-medium"
              >
                {t('host.workflows.picker.goToModuleManagement')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
