'use client';

import Link from 'next/link';
import { Clock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  resolveWorkflow,
  type WorkflowModule,
} from '@/features/host-console/workflowModules';
import type { Event } from '@/types/domain';
import type { WorkflowTemplateRecord } from '@/lib/api/workflow-templates';

interface TemplateSelectionPanelProps {
  events: Event[];
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
  templates: WorkflowTemplateRecord[];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
  loadingTemplates: boolean;
  modules: WorkflowModule[];
  onConfirm: () => void;
}

export default function TemplateSelectionPanel({
  events,
  selectedEventId,
  onEventChange,
  templates,
  selectedTemplateId,
  onTemplateChange,
  loadingTemplates,
  modules,
  onConfirm,
}: TemplateSelectionPanelProps) {
  const { t } = useTranslation();
  const selectedTemplate = templates.find((tpl) => tpl.template_id === selectedTemplateId);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-xl font-semibold text-foreground mb-6">
        {t('host.flowControl.selectTemplate')}
      </h2>

      <div className="space-y-5">
        {/* Event selector */}
        {events.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('host.flowControl.selectEvent')}
            </label>
            <CustomSelect
              options={events.map((event) => ({
                value: event.event_id,
                label: event.name,
              }))}
              value={selectedEventId}
              onChange={onEventChange}
              placeholder={t('host.flowControl.selectEventPlaceholder')}
              className="w-full md:w-auto md:min-w-[300px]"
            />
          </div>
        )}

        {/* Template selector */}
        {selectedEventId && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {t('host.flowControl.selectTemplateLabel')}
            </label>
            {loadingTemplates ? (
              <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
            ) : templates.length > 0 ? (
              <CustomSelect
                options={templates.map((tpl) => ({
                  value: tpl.template_id,
                  label: tpl.name,
                }))}
                value={selectedTemplateId}
                onChange={onTemplateChange}
                placeholder={t('host.flowControl.selectTemplatePlaceholder')}
                className="w-full md:w-auto md:min-w-[300px]"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {t('host.flowControl.noTemplates')}
                <Link href="/host/workflows" className="ml-1 text-primary hover:underline">
                  {t('host.flowControl.goToCreateTemplate')}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Template preview */}
        {selectedTemplate && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="text-sm font-medium text-muted-foreground mb-3">
              {t('host.flowControl.templatePreview')}
            </div>
            <div className="space-y-2">
              {resolveWorkflow(selectedTemplate.steps, modules).map((step, index) => (
                <div key={step.stepId} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{step.title}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t('host.flowControl.minutesSuffix', { minutes: step.durationMinutes })}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
              {t('host.flowControl.stepsAndDuration', {
                count: selectedTemplate.steps.length,
                minutes: selectedTemplate.steps.reduce((sum, s) => sum + s.durationMinutes, 0),
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={!selectedTemplateId}
            onClick={onConfirm}
            className="px-6 py-2.5 rounded-button bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('host.flowControl.confirmStart')}
          </button>
          {selectedEventId && (
            <Link
              href="/host/workflows"
              className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('host.flowControl.goToWorkflows')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
