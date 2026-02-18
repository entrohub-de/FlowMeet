'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

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
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-lg">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm text-muted-foreground">
          <p>
            {t('privacy.cookieBanner.message')}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {t('privacy.cookieBanner.learnMore')}
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => handleAccept('essential')}
            className="px-button h-button text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-button transition-colors"
          >
            {t('privacy.cookieBanner.essentialOnly')}
          </button>
          <button
            onClick={() => handleAccept('all')}
            className="px-button h-button text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-button transition-colors"
          >
            {t('privacy.cookieBanner.acceptAll')}
          </button>
        </div>
      </div>
    </div>
  );
}
