'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="text-lg text-muted-foreground">
          {t('errors.notFound')}
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          {t('errors.backHome')}
        </Link>
      </div>
    </div>
  );
}
