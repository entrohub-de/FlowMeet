'use client';

import { useState, useEffect } from 'react';
import { getActiveAds } from '@/lib/api/ads';
import type { Advertisement } from '@/types/domain';
import { ExternalLink, Megaphone, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface AdBannerProps {
  eventId?: string;
}

export default function AdBanner({ eventId }: AdBannerProps) {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getActiveAds(eventId)
      .then(setAds)
      .catch(() => setAds([]));
  }, [eventId]);

  if (dismissed || ads.length === 0) return null;

  return (
    <section className="relative rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-800/30 p-4 space-y-3">
      {/* Sponsored label + dismiss */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Megaphone className="w-3.5 h-3.5" />
          <span className="text-xs font-medium tracking-wide uppercase">{t('admin.ads.sponsored')}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Ad items */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {ads.map((ad) => {
          const Wrapper = ad.link_url ? 'a' : 'div';
          const linkProps = ad.link_url
            ? { href: ad.link_url, target: '_blank' as const, rel: 'noopener noreferrer' }
            : {};
          return (
          <Wrapper
            key={ad.ad_id}
            {...linkProps}
            className={`shrink-0 w-full sm:w-72 rounded-xl overflow-hidden bg-white dark:bg-card border border-amber-200/40 dark:border-amber-800/20 transition-all duration-200 block group ${
              ad.link_url ? 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''
            }`}
          >
            {ad.image_url ? (
              <div className="relative overflow-hidden">
                <img src={ad.image_url} alt={ad.title} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">{ad.title}</span>
              </div>
            )}
            <div className="px-3 py-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{ad.title}</p>
                {ad.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{ad.description}</p>
                )}
              </div>
              {ad.link_url && (
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-amber-500 group-hover:text-amber-600 transition-colors" />
              )}
            </div>
          </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
