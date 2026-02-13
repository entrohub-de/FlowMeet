'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  renameWorkflowTemplate,
  deleteWorkflowTemplate as deleteWorkflowTemplateById,
  updateWorkflowTemplateSteps,
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
  resolveWorkflow,
  type ModuleDefinition,
  type WorkflowModule,
  type WorkflowModuleCategory,
  type WorkflowStepConfig,
} from '@/features/host-console/workflowModules';
import WorkflowStepList from '@/components/workflow/WorkflowStepList';
import ModuleLibrary from '@/components/workflow/ModuleLibrary';
import ModuleEditModal from '@/components/workflow/ModuleEditModal';
import ModulePicker from '@/components/workflow/ModulePicker';
import TemplateLibrary from '@/components/workflow/TemplateLibrary';
import { ArrowLeft, Save } from 'lucide-react';

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

  // Template editor state: null = list view, '__new__' = creating, templateId = editing
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  const [lastAddedStepId, setLastAddedStepId] = useState('');

  // Track whether workflowConfig changes come from loading vs user actions
  const configSourceRef = useRef<'load' | 'user'>('load');
  const editingTemplateIdRef = useRef(editingTemplateId);
  editingTemplateIdRef.current = editingTemplateId;

  // Auto-save workflowConfig changes to the editing template (debounced)
  useEffect(() => {
    if (configSourceRef.current === 'load') {
      configSourceRef.current = 'user';
      return;
    }
    const tid = editingTemplateIdRef.current;
    if (!tid || tid === '__new__') return;

    const timer = setTimeout(() => {
      updateWorkflowTemplateSteps(tid, workflowConfig)
        .then(() => {
          setTemplates((prev) =>
            prev.map((tmpl) =>
              tmpl.template_id === tid ? { ...tmpl, steps: workflowConfig } : tmpl
            )
          );
        })
        .catch((err) => console.error('Failed to persist workflow steps:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, [workflowConfig]);

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
        const data = await getWorkflowTemplates(selectedEventId);
        setTemplates(data);
      } catch (error) {
        console.error('Failed to load workflow templates:', error);
      }
    };

    loadData();
  }, [selectedEventId]);

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

  // Template operations
  const enterEditMode = (template: WorkflowTemplateRecord) => {
    configSourceRef.current = 'load';
    setEditingTemplateId(template.template_id);
    setTemplateName(template.name);
    setWorkflowConfig(cloneStepsWithNewIds(template.steps));
    setTemplateError('');
    setLastAction('');
  };

  const enterCreateMode = () => {
    configSourceRef.current = 'load';
    setEditingTemplateId('__new__');
    setTemplateName('');
    setWorkflowConfig([]);
    setTemplateError('');
    setLastAction('');
  };

  const backToList = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setWorkflowConfig([]);
    setTemplateError('');
    setLastAction('');
  };

  const saveTemplate = async () => {
    const safeName = templateName.trim();
    if (!safeName) {
      setTemplateError(t('host.workflows.errors.enterTemplateName'));
      return;
    }

    setTemplateSaving(true);
    try {
      if (editingTemplateId === '__new__') {
        // Create new template
        if (!selectedEventId) return;
        const template = await createWorkflowTemplate(
          selectedEventId,
          safeName,
          cloneStepsWithNewIds(workflowConfig)
        );
        setTemplates((prev) => [template, ...prev]);
        // Switch to editing the newly created template
        setEditingTemplateId(template.template_id);
      } else if (editingTemplateId) {
        // Rename existing template
        const current = templates.find((tpl) => tpl.template_id === editingTemplateId);
        if (current?.name !== safeName) {
          await renameWorkflowTemplate(editingTemplateId, safeName);
          setTemplates((prev) =>
            prev.map((tpl) =>
              tpl.template_id === editingTemplateId ? { ...tpl, name: safeName } : tpl
            )
          );
        }
      }
      setTemplateError('');
    } catch (error) {
      console.error('Failed to save template:', error);
      setTemplateError(t('host.workflows.errors.saveTemplate'));
    } finally {
      setTemplateSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      await deleteWorkflowTemplateById(templateId);
      setTemplates((prev) => prev.filter((item) => item.template_id !== templateId));
    } catch (error) {
      console.error('Failed to delete workflow template:', error);
    }
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

  const updateModuleHandler = async (updated: WorkflowModule) => {
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
        {/* Tab switcher - hide when in editor mode */}
        {editingTemplateId === null && (
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
        )}

        {/* Template list view */}
        {activeTab === 'templates' && editingTemplateId === null && (
          <TemplateLibrary
            templates={templates}
            allModules={availableModules}
            onEdit={enterEditMode}
            onDelete={deleteTemplate}
            onCreate={enterCreateMode}
          />
        )}

        {/* Template editor view */}
        {activeTab === 'templates' && editingTemplateId !== null && (
          <section className="space-y-4">
            {/* Back button */}
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('host.workflows.templates.backToList')}
            </button>

            {/* Template name + save */}
            <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('host.workflows.templates.inputPlaceholder')}
                  className="h-12 flex-1 min-w-0 rounded-button border border-border px-3 bg-background text-sm"
                />
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={!templateName.trim() || templateSaving}
                  className="h-12 px-4 inline-flex items-center gap-1.5 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm shrink-0 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {t('common.save')}
                </button>
              </div>
              {templateError && <p className="text-xs text-red-600">{templateError}</p>}
            </div>

            {/* Workflow step editor */}
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

        {/* Module library view */}
        {activeTab === 'modules' && editingTemplateId === null && (
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
          onSave={(data) => updateModuleHandler({ ...editingModule, ...data })}
          error={customError}
        />
      )}
    </div>
  );
}
