'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import {
  createWorkflowTemplate,
  deleteWorkflowTemplate as deleteWorkflowTemplateById,
  renameWorkflowTemplate,
  type WorkflowTemplateRecord,
} from '@/lib/api/workflow-templates';
import type { WorkflowStepConfig } from '@/features/host-console/workflowModules';
import { Save, Trash2 } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';

interface TemplatePanelProps {
  eventId: string;
  templates: WorkflowTemplateRecord[];
  onTemplatesChange: (updater: (prev: WorkflowTemplateRecord[]) => WorkflowTemplateRecord[]) => void;
  selectedTemplateId: string;
  onSelectedTemplateIdChange: (id: string) => void;
  workflowConfig: WorkflowStepConfig[];
  onApplyTemplate: (steps: WorkflowStepConfig[]) => void;
  cloneSteps: (steps: WorkflowStepConfig[]) => WorkflowStepConfig[];
}

export default function TemplatePanel({
  eventId,
  templates,
  onTemplatesChange,
  selectedTemplateId,
  onSelectedTemplateIdChange,
  workflowConfig,
  onApplyTemplate,
  cloneSteps,
}: TemplatePanelProps) {
  const { t } = useTranslation();
  const [templateName, setTemplateName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [templateSaved, setTemplateSaved] = useState(false);

  const saveCurrentAsTemplate = async () => {
    if (!eventId) return;
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
        eventId,
        safeName,
        cloneSteps(workflowConfig)
      );
      onTemplatesChange((prev) => [template, ...prev]);
      onSelectedTemplateIdChange(template.template_id);
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
    onApplyTemplate(cloneSteps(selected.steps));
  };

  const handleRenameTemplate = async () => {
    const safeName = renameName.trim();
    if (!safeName || !selectedTemplateId || selectedTemplateId === '__new__') return;
    const current = templates.find((tpl) => tpl.template_id === selectedTemplateId);
    if (current?.name === safeName) return;
    try {
      await renameWorkflowTemplate(selectedTemplateId, safeName);
      onTemplatesChange((prev) =>
        prev.map((tpl) => (tpl.template_id === selectedTemplateId ? { ...tpl, name: safeName } : tpl))
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
      onTemplatesChange((prev) => {
        const next = prev.filter((item) => item.template_id !== templateId);
        onSelectedTemplateIdChange(next[0]?.template_id ?? '__new__');
        return next;
      });
    } catch (error) {
      console.error('Failed to delete workflow template:', error);
      setTemplateError(t('host.workflows.errors.deleteTemplate'));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
      <CustomSelect
        value={selectedTemplateId}
        onChange={(value) => {
          onSelectedTemplateIdChange(value);
          setTemplateError('');
          if (value === '__new__') {
            onApplyTemplate([]);
          } else {
            applyTemplate(value);
            const tpl = templates.find((item) => item.template_id === value);
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
              const target = templates.find((tpl) => tpl.template_id === selectedTemplateId);
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
  );
}
