'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
          {t('home.headline')}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
          {t('home.subheadline')}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/auth/signup"
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors w-full sm:w-auto"
          >
            {t('home.createAccount')}
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors w-full sm:w-auto"
          >
            {t('home.login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
