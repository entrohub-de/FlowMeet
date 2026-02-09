'use client';

import { useTranslation } from '@/lib/i18n/context';

export default function TopicsPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{t('user.topics')}</h1>
      <p className="text-muted-foreground">
        {t('user.topicsPage')}
      </p>
    </div>
  );
}
