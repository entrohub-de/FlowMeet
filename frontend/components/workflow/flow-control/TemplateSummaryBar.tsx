'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface TemplateSummaryBarProps {
  templateName: string | undefined;
  onChangeTemplate: () => void;
}

export default function TemplateSummaryBar({
  templateName,
  onChangeTemplate,
}: TemplateSummaryBarProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{t('host.flowControl.currentTemplate')}</span>
        <span className="font-medium text-foreground">{templateName}</span>
      </div>
      <button
        type="button"
        onClick={onChangeTemplate}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-button border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {t('host.flowControl.changeTemplate')}
      </button>
    </div>
  );
}
