'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Plus } from 'lucide-react';
import type { WorkflowTemplateRecord } from '@/lib/api/workflow-templates';
import type { WorkflowModule } from '@/features/host-console/workflowModules';
import TemplateCard from './TemplateCard';

interface TemplateLibraryProps {
  templates: WorkflowTemplateRecord[];
  allModules: WorkflowModule[];
  onEdit: (template: WorkflowTemplateRecord) => void;
  onDelete: (templateId: string) => void;
  onCreate: () => void;
}

export default function TemplateLibrary({
  templates,
  allModules,
  onEdit,
  onDelete,
  onCreate,
}: TemplateLibraryProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">{t('host.workflows.templates.libraryTitle')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('host.workflows.templates.total', { count: templates.length })}
          </span>
        </div>
        <div className="space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t('host.workflows.templates.empty')}</p>
          ) : (
            templates.map((item) => (
              <TemplateCard
                key={item.template_id}
                template={item}
                allModules={allModules}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        {t('host.workflows.templates.newTemplate')}
      </button>
    </section>
  );
}
