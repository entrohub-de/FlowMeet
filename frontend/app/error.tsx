'use client';

import { useTranslation } from '@/lib/i18n/context';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          {t('errors.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('errors.description')}
        </p>
        <button
          onClick={reset}
          className="inline-block mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          {t('errors.retry')}
        </button>
      </div>
    </div>
  );
}
