'use client';

import { useTranslation } from '@/lib/i18n/context';
import { Plus } from 'lucide-react';
import type { WorkflowModule } from '@/features/host-console/workflowModules';
import ModuleCard from './ModuleCard';

interface ModuleLibraryProps {
  modules: WorkflowModule[];
  onEdit: (module: WorkflowModule) => void;
  onDelete: (moduleId: string) => void;
  onCreate: () => void;
}

export default function ModuleLibrary({
  modules,
  onEdit,
  onDelete,
  onCreate,
}: ModuleLibraryProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">{t('host.workflows.custom.libraryTitle')}</h2>
          <span className="text-xs text-muted-foreground">
            {t('host.workflows.custom.total', { count: modules.length })}
          </span>
        </div>
        <div className="space-y-2">
          {modules.map((item) => (
            <ModuleCard
              key={item.id}
              module={item}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        {t('host.workflows.custom.title')}
      </button>
    </section>
  );
}
