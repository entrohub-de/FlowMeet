'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

const COOKIE_CONSENT_KEY = 'flowmeet_cookie_consent';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key) return;

    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: false, // we handle this manually below
      persistence: 'localStorage+cookie',
      opt_out_capturing_by_default: true, // respect cookie consent
    });

    // Check existing consent
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent === 'all') {
      posthog.opt_in_capturing();
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
