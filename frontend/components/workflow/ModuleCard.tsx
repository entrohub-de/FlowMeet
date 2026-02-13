'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { WorkflowModule } from '@/features/host-console/workflowModules';

interface ModuleCardProps {
  module: WorkflowModule;
  onEdit: (module: WorkflowModule) => void;
  onDelete: (moduleId: string) => void;
}

export default function ModuleCard({ module, onEdit, onDelete }: ModuleCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="min-w-0 flex-1 text-left flex items-center gap-2 hover:bg-muted/50 transition-colors rounded-md -m-1 p-1"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm text-foreground truncate">{module.title}</span>
              {module.id.startsWith('custom-') && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {t('host.workflows.custom.customBadge')}
                </span>
              )}
              <span className="text-xs text-muted-foreground shrink-0">
                {t('host.workflows.current.minutesLabel', { minutes: module.durationMinutes })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{module.description}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(module)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-button border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={t('common.edit')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(module.id)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-button border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50"
            aria-label={t('host.workflows.custom.deleteModuleAria')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 border-t border-border pt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-muted-foreground">
              {t('host.workflows.custom.category')}:
              <span className="text-foreground ml-1">{t(`host.workflows.custom.categories.${module.category}`)}</span>
            </span>
            <span className="text-muted-foreground">
              {t('host.workflows.custom.pairingMode')}:
              <span className="text-foreground ml-1">
                {module.definition.pairingMode === 'group'
                  ? t('host.workflows.custom.pairingModeGroup')
                  : module.definition.pairingMode === '1v1'
                  ? t('host.workflows.custom.pairingMode1v1')
                  : t('host.workflows.custom.pairingModeNone')}
              </span>
            </span>
            <span className="text-muted-foreground">
              {t('host.workflows.custom.enableTopics')}:
              <span className="text-foreground ml-1">{module.definition.enableTopics ? '✓' : '✗'}</span>
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
