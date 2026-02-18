'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { WORKFLOW_MODULE_CATEGORIES, type WorkflowModuleCategory, type ModuleDefinition } from '@/features/host-console/workflowModules';

interface ModuleFormData {
  title: string;
  description: string;
  durationMinutes: number;
  category: WorkflowModuleCategory;
  definition: ModuleDefinition;
}

interface ModuleEditModalProps {
  /** Pre-fill for edit mode; omit for create mode */
  initial?: ModuleFormData;
  onClose: () => void;
  onSave: (data: ModuleFormData) => void | Promise<void>;
  error?: string;
}

export default function ModuleEditModal({ initial, onClose, onSave, error }: ModuleEditModalProps) {
  const { t } = useTranslation();
  const isCreate = !initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 15);
  const [category, setCategory] = useState<WorkflowModuleCategory>(initial?.category ?? 'networking');
  const [definition, setDefinition] = useState<ModuleDefinition>(initial?.definition ?? {});

  const handleSave = () => {
    onSave({ title, description, durationMinutes, category, definition });
  };

  return (
    <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[1px] p-4 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-xl border border-border bg-card shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">
            {isCreate ? t('host.workflows.custom.title') : t('common.edit')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-border hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('host.workflows.custom.namePlaceholder')}
              className="h-9 flex-1 min-w-0 rounded-button border border-border px-3 bg-background text-sm"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                className="h-9 w-16 rounded-button border border-border px-2 bg-background text-sm text-center"
              />
              <span className="text-xs text-muted-foreground">{t('host.workflows.current.minuteUnit')}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('host.workflows.custom.category')}</span>
            <div className="flex flex-wrap gap-1.5">
              {WORKFLOW_MODULE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                    category === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {t(`host.workflows.custom.categories.${cat}`)}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t('host.workflows.custom.descriptionPlaceholder')}
            rows={2}
            className="w-full rounded-button border border-border px-3 py-2 bg-background text-sm resize-none"
          />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('host.workflows.custom.pairingMode')}</span>
            <div className="flex flex-wrap gap-1.5">
              {([undefined, 'group', '1v1'] as const).map((mode) => (
                <button
                  key={mode ?? 'none'}
                  type="button"
                  onClick={() => setDefinition((prev) => ({ ...prev, pairingMode: mode }))}
                  className={`h-7 px-3 rounded-full text-xs font-medium transition-colors ${
                    definition.pairingMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {mode === 'group'
                    ? t('host.workflows.custom.pairingModeGroup')
                    : mode === '1v1'
                    ? t('host.workflows.custom.pairingMode1v1')
                    : t('host.workflows.custom.pairingModeNone')}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={definition.enableTopics ?? false}
              onChange={(event) => setDefinition((prev) => ({ ...prev, enableTopics: event.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-xs text-foreground">{t('host.workflows.custom.enableTopics')}</span>
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="h-9 w-full inline-flex items-center justify-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
          >
            {isCreate && <Plus className="w-4 h-4" />}
            {isCreate ? t('host.workflows.custom.save') : t('common.save')}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
