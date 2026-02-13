'use client';

import { useEffect, useMemo, useState, type TouchEvent } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import {
  createWorkflowTemplate,
  deleteWorkflowTemplate as deleteWorkflowTemplateById,
  renameWorkflowTemplate,
  getWorkflowTemplates,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';
import {
  getAllWorkflowModules,
  createCustomWorkflowModule,
  updateWorkflowModule,
  deleteWorkflowModule,
} from '@/lib/api/workflow-modules';
import {
  createStepFromModule,
  getDefaultWorkflowConfig,
  loadEventWorkflow,
  resolveWorkflow,
  type ModuleDefinition,
  type WorkflowModule,
  type WorkflowModuleCategory,
  type WorkflowStepConfig,
} from '@/features/host-console/workflowModules';
import { Plus, Save, ArrowUp, ArrowDown, Trash2, GripVertical } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import ModuleCard from '@/components/workflow/ModuleCard';
import ModuleEditModal from '@/components/workflow/ModuleEditModal';
import ModulePicker from '@/components/workflow/ModulePicker';

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
  const [allModules, setAllModules] = useState<WorkflowModule[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplateRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);
  const [customError, setCustomError] = useState('');
  const [lastAction, setLastAction] = useState('');

  const [templateName, setTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [renameName, setRenameName] = useState('');
  const [lastAddedStepId, setLastAddedStepId] = useState('');

  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const [isCreatingModule, setIsCreatingModule] = useState(false);
  const [editingModule, setEditingModule] = useState<WorkflowModule | null>(null);

  useEffect(() => {
    getAllWorkflowModules()
      .then(setAllModules)
      .catch((err) => console.error('Failed to load modules:', err));
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

  const availableModules = allModules;

  useEffect(() => {
    if (!selectedEventId) return;

    const loadData = async () => {
      try {
        setTemplateLoading(true);
        const existing = loadEventWorkflow(selectedEventId);
        setWorkflowConfig(existing ?? getDefaultWorkflowConfig(allModules));

        const data = await getWorkflowTemplates(selectedEventId);
        setTemplates(data);
        setSelectedTemplateId((prev) =>
          data.some((item) => item.template_id === prev) ? prev : (data[0]?.template_id ?? '__new__')
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


  const addModulesToWorkflow = (moduleIds: string[]) => {
    const newSteps: WorkflowStepConfig[] = [];
    for (const moduleId of moduleIds) {
      const step = createStepFromModule(moduleId, availableModules);
      if (step) newSteps.push(step);
    }
    if (newSteps.length === 0) return;

    setWorkflowConfig((prev) => [...prev, ...newSteps]);
    const titles = newSteps.map((s) => {
      const mod = availableModules.find((m) => m.id === s.moduleId);
      return mod?.title ?? t('host.workflows.messages.untitledModule');
    });
    setLastAction(
      t('host.workflows.messages.addedModule', { title: titles.join(', ') })
    );
    setLastAddedStepId(newSteps[newSteps.length - 1].stepId);
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

  const createCustomModule = async (data: {
    title: string;
    description: string;
    durationMinutes: number;
    category: WorkflowModuleCategory;
    definition: ModuleDefinition;
  }) => {
    const safeTitle = data.title.trim();
    if (!safeTitle) {
      setCustomError(t('host.workflows.errors.enterModuleName'));
      return;
    }

    const safeDuration = Number.isFinite(data.durationMinutes)
      ? Math.max(1, Math.round(data.durationMinutes))
      : 1;

    try {
      const created = await createCustomWorkflowModule({
        title: safeTitle,
        description: data.description.trim() || t('host.workflows.messages.defaultCustomModuleDescription'),
        durationMinutes: safeDuration,
        category: data.category,
        definition: data.definition,
      });

      setAllModules((prev) => [...prev, created]);
      setCustomError('');
      setIsCreatingModule(false);
    } catch (error) {
      console.error('Failed to create custom module:', error);
      setCustomError(t('host.workflows.errors.saveTemplate'));
      throw error;
    }
  };

  const removeModule = async (moduleId: string) => {
    try {
      await deleteWorkflowModule(moduleId);
      setAllModules((prev) => prev.filter((item) => item.id !== moduleId));
      setCustomError('');
    } catch (error) {
      console.error('Failed to delete custom module:', error);
      setCustomError(t('host.workflows.errors.deleteTemplate'));
    }
  };

  const updateModule = async (updated: WorkflowModule) => {
    const safeTitle = updated.title.trim();
    if (!safeTitle) return;
    const safeDuration = Number.isFinite(updated.durationMinutes)
      ? Math.max(1, Math.round(updated.durationMinutes))
      : 1;

    const normalized: WorkflowModule = {
      ...updated,
      title: safeTitle,
      durationMinutes: safeDuration,
      description: updated.description.trim(),
    };

    try {
      await updateWorkflowModule(updated.id, {
        title: normalized.title,
        description: normalized.description,
        durationMinutes: normalized.durationMinutes,
        category: normalized.category,
        definition: normalized.definition,
      });

      setAllModules((prev) =>
        prev.map((item) => (item.id === normalized.id ? normalized : item))
      );
      setEditingModule(null);
      setCustomError('');
    } catch (error) {
      console.error('Failed to update custom module:', error);
      setCustomError(t('host.workflows.errors.saveTemplate'));
    }
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
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
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

  const handleRenameTemplate = async () => {
    const safeName = renameName.trim();
    if (!safeName || !selectedTemplateId || selectedTemplateId === '__new__') return;
    const current = templates.find((t) => t.template_id === selectedTemplateId);
    if (current?.name === safeName) return;
    try {
      await renameWorkflowTemplate(selectedTemplateId, safeName);
      setTemplates((prev) =>
        prev.map((t) => (t.template_id === selectedTemplateId ? { ...t, name: safeName } : t))
      );
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2000);
    } catch (error) {
      console.error('Failed to rename template:', error);
      setTemplateError(t('host.workflows.errors.saveTemplate'));
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await deleteWorkflowTemplateById(templateId);
      setTemplates((prev) => {
        const next = prev.filter((item) => item.template_id !== templateId);
        setSelectedTemplateId((current) =>
          current === templateId ? (next[0]?.template_id ?? '__new__') : current
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
            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
              <CustomSelect
                value={selectedTemplateId}
                onChange={(value) => {
                  setSelectedTemplateId(value);
                  setTemplateError('');
                  if (value === '__new__') {
                    setWorkflowConfig([]);
                  } else {
                    applyTemplate(value);
                    const tpl = templates.find((t) => t.template_id === value);
                    if (tpl) setRenameName(tpl.name);
                  }
                }}
                options={[
                  { value: '__new__', label: `+ ${t('host.workflows.templates.newTemplate')}` },
                  ...templates.map((item) => ({
                    value: item.template_id,
                    label: t('host.workflows.templates.optionLabel', {
                      name: item.name,
                      count: item.steps.length,
                    }),
                  })),
                ]}
                placeholder={t('host.workflows.templates.selectTemplate')}
              />

              {templateLoading && (
                <p className="text-xs text-muted-foreground">{t('host.workflows.templates.loading')}</p>
              )}
              {templateError && <p className="text-xs text-red-600">{templateError}</p>}
              {templateSaved && <p className="text-xs text-green-600">{t('common.saved')}</p>}

              {selectedTemplateId === '__new__' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(event) => setTemplateName(event.target.value)}
                    placeholder={t('host.workflows.templates.inputPlaceholder')}
                    className="h-12 flex-1 min-w-0 rounded-button border border-border px-3 bg-background text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveCurrentAsTemplate}
                    className="h-12 px-4 inline-flex items-center gap-1.5 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm shrink-0"
                  >
                    <Save className="w-4 h-4" />
                    {t('common.save')}
                  </button>
                </div>
              )}

              {selectedTemplateId && selectedTemplateId !== '__new__' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameName}
                    onChange={(event) => setRenameName(event.target.value)}
                    placeholder={t('host.workflows.templates.inputPlaceholder')}
                    className="h-12 flex-1 min-w-0 rounded-button border border-border px-3 bg-background text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRenameTemplate}
                    disabled={!renameName.trim()}
                    className="h-12 w-12 inline-flex items-center justify-center rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                    aria-label={t('common.save')}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = templates.find((t) => t.template_id === selectedTemplateId);
                      const ok = window.confirm(
                        t('host.workflows.templates.deleteConfirm', { name: target?.name ?? '' })
                      );
                      if (!ok) return;
                      deleteTemplate(selectedTemplateId);
                    }}
                    className="h-12 w-12 inline-flex items-center justify-center rounded-button border border-red-200 text-red-600 hover:bg-red-50 shrink-0"
                    aria-label={t('host.workflows.templates.deleteAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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
                  className="h-12 px-4 inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90"
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
            {/* Module Library (primary content, shown first) */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">{t('host.workflows.custom.libraryTitle')}</h2>
                <span className="text-xs text-muted-foreground">
                  {t('host.workflows.custom.total', { count: availableModules.length })}
                </span>
              </div>
              <div className="space-y-2">
                {availableModules.map((item) => (
                  <ModuleCard
                    key={item.id}
                    module={item}
                    onEdit={setEditingModule}
                    onDelete={removeModule}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCreatingModule(true)}
              className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('host.workflows.custom.title')}
            </button>
          </section>
        )}
      </div>


      {isModulePickerOpen && (
        <ModulePicker
          availableModules={availableModules}
          onClose={() => setIsModulePickerOpen(false)}
          onConfirm={(selectedIds) => {
            addModulesToWorkflow(selectedIds);
            setIsModulePickerOpen(false);
          }}
          onGoToModuleManagement={() => {
            setIsModulePickerOpen(false);
            setActiveTab('modules');
          }}
        />
      )}

      {isCreatingModule && (
        <ModuleEditModal
          onClose={() => { setIsCreatingModule(false); setCustomError(''); }}
          onSave={createCustomModule}
          error={customError}
        />
      )}

      {editingModule && (
        <ModuleEditModal
          initial={editingModule}
          onClose={() => setEditingModule(null)}
          onSave={(data) => updateModule({ ...editingModule, ...data })}
          error={customError}
        />
      )}
    </div>
  );
}
