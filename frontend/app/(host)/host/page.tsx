'use client';

import { useTranslation } from '@/lib/i18n/context';

export default function HostPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-full sm:max-w-full lg:max-w-7xl lg:mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          {t('host.eventManagement')}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {t('host.eventManagementDesc')}
        </p>
      </div>
    </div>
  );
}
