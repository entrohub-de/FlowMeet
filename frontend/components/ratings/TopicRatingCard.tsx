'use client';

import { useTranslation } from '@/lib/i18n/context';

export function TopicRatingCard() {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl">
      <div className="bg-card border border-border rounded-lg p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">{t('rating.topics.title')}</h2>
        <p className="text-muted-foreground mb-4">{t('rating.topics.description')}</p>
        <p className="text-sm text-muted-foreground mt-2">{t('rating.topics.placeholder')}</p>
      </div>
    </div>
  );
}
