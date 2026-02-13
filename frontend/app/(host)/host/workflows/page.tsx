'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import {
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
import TemplatePanel from '@/components/workflow/TemplatePanel';
import WorkflowStepList from '@/components/workflow/WorkflowStepList';
import ModuleLibrary from '@/components/workflow/ModuleLibrary';
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
  const [customError, setCustomError] = useState('');
  const [lastAction, setLastAction] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [lastAddedStepId, setLastAddedStepId] = useState('');

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
        const existing = loadEventWorkflow(selectedEventId);
        setWorkflowConfig(existing ?? getDefaultWorkflowConfig(allModules));

        const data = await getWorkflowTemplates(selectedEventId);
        setTemplates(data);
        setSelectedTemplateId((prev) =>
          data.some((item) => item.template_id === prev) ? prev : (data[0]?.template_id ?? '__new__')
        );
      } catch (error) {
        console.error('Failed to load workflow templates:', error);
      }
    };

    loadData();
  }, [selectedEventId, t]);

  const resolvedSteps = useMemo(
    () => resolveWorkflow(workflowConfig, availableModules),
    [workflowConfig, availableModules]
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
            <TemplatePanel
              eventId={selectedEventId}
              templates={templates}
              onTemplatesChange={setTemplates}
              selectedTemplateId={selectedTemplateId}
              onSelectedTemplateIdChange={setSelectedTemplateId}
              workflowConfig={workflowConfig}
              onApplyTemplate={setWorkflowConfig}
              cloneSteps={cloneStepsWithNewIds}
            />

            <WorkflowStepList
              resolvedSteps={resolvedSteps}
              onReorder={setWorkflowConfig}
              onDurationChange={updateDuration}
              onRemove={removeStep}
              onAddModule={() => setIsModulePickerOpen(true)}
              lastAction={lastAction}
            />
          </section>
        )}

        {activeTab === 'modules' && (
          <ModuleLibrary
            modules={availableModules}
            onEdit={setEditingModule}
            onDelete={removeModule}
            onCreate={() => setIsCreatingModule(true)}
          />
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
