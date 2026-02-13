'use client';

import { useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { WorkflowTemplateRecord } from '@/lib/api/workflow-templates';
import type { WorkflowModule } from '@/features/host-console/workflowModules';

interface TemplateCardProps {
  template: WorkflowTemplateRecord;
  allModules: WorkflowModule[];
  onEdit: (template: WorkflowTemplateRecord) => void;
  onDelete: (templateId: string) => void;
}

export default function TemplateCard({ template, allModules, onEdit, onDelete }: TemplateCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const totalMinutes = template.steps.reduce((sum, s) => sum + s.durationMinutes, 0);

  const resolveStepTitle = (moduleId: string, snapshot?: string) => {
    const mod = allModules.find((m) => m.id === moduleId);
    return mod?.title ?? snapshot ?? t('host.workflows.messages.untitledModule');
  };

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
              <span className="font-medium text-sm text-foreground truncate">{template.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {t('host.workflows.templates.stepsAndDuration', {
                  count: template.steps.length,
                  minutes: totalMinutes,
                })}
              </span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(template)}
            className="h-7 w-7 inline-flex items-center justify-center rounded-button border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={t('common.edit')}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 inline-flex items-center justify-center rounded-button border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50"
                aria-label={t('host.workflows.templates.deleteAria')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('host.workflows.templates.deleteConfirm', { name: template.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(template.template_id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isExpanded && (
        <div className="px-2.5 pb-2.5 border-t border-border pt-2">
          {template.steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('host.workflows.current.empty')}</p>
          ) : (
            <div className="space-y-1">
              {template.steps.map((step, idx) => (
                <div key={step.stepId} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {idx + 1}. <span className="text-foreground">{resolveStepTitle(step.moduleId, step.titleSnapshot)}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {t('host.workflows.current.minutesLabel', { minutes: step.durationMinutes })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
