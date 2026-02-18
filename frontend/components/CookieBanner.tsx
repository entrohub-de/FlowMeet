'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';
import posthog from 'posthog-js';

const COOKIE_CONSENT_KEY = 'flowmeet_cookie_consent';

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = (choice: 'all' | 'essential') => {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    if (choice === 'all') {
      posthog.opt_in_capturing();
    } else {
      posthog.opt_out_capturing();
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('privacy.cookieBanner.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('privacy.cookieBanner.message')}{' '}
          <Link href="/privacy" className="text-primary hover:underline" target="_blank">
            {t('privacy.cookieBanner.learnMore')}
          </Link>
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => handleAccept('essential')}
            className="flex-1 px-button h-button text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-button transition-colors"
          >
            {t('privacy.cookieBanner.essentialOnly')}
          </button>
          <button
            onClick={() => handleAccept('all')}
            className="flex-1 px-button h-button text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-button transition-colors"
          >
            {t('privacy.cookieBanner.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
