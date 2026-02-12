'use client';

import { useTranslation } from '@/lib/i18n/context';

export default function HostWorkflowsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
          {t('nav.host.workflowSettings')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('host.eventManagementDesc')}
        </p>
      </div>
    </div>
  );
}
