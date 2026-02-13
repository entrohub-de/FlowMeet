'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { WorkflowModule } from '@/features/host-console/workflowModules';

interface ModulePickerProps {
  availableModules: WorkflowModule[];
  onClose: () => void;
  onConfirm: (selectedModuleIds: string[]) => void;
  onGoToModuleManagement: () => void;
}

export default function ModulePicker({ availableModules, onClose, onConfirm, onGoToModuleManagement }: ModulePickerProps) {
  const { t } = useTranslation();
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => setSelectedModuleIds(new Set());
  }, []);

  const handleConfirm = () => {
    if (selectedModuleIds.size === 0) return;
    onConfirm(Array.from(selectedModuleIds));
  };

  return (
    <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[1px] p-4 flex items-end sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-lg rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">{t('host.workflows.picker.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted"
            aria-label={t('host.workflows.picker.closeAria')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4 space-y-2">
          {availableModules.map((item) => {
            const isSelected = selectedModuleIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setSelectedModuleIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                className={`w-full text-left rounded-lg border bg-background p-3 min-h-12 transition-colors ${
                  isSelected
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
            );
          })}
        </div>
        <div className="p-4 border-t border-border space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedModuleIds.size === 0}
            className="h-12 w-full rounded-button bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedModuleIds.size > 0
              ? `${t('host.workflows.picker.confirmAdd')}(${selectedModuleIds.size})`
              : t('host.workflows.picker.confirmAdd')}
          </button>
          <button
            type="button"
            onClick={onGoToModuleManagement}
            className="h-12 w-full rounded-button border border-border hover:bg-muted text-sm font-medium"
          >
            {t('host.workflows.picker.goToModuleManagement')}
          </button>
        </div>
      </div>
    </div>
  );
}
