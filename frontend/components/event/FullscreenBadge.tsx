'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, getPreferences } from '@/lib/api/profile';
import type { Profile, Preferences } from '@/types/domain';

interface FullscreenBadgeProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export default function FullscreenBadge({ userId, open, onClose }: FullscreenBadgeProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  // Fetch profile & preferences
  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;

    Promise.all([getProfile(userId), getPreferences(userId)]).then(([p, pref]) => {
      if (cancelled) return;
      setProfile(p);
      setPreferences(pref);
    });

    return () => { cancelled = true; };
  }, [open, userId]);

  // Enter fullscreen
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const el = containerRef.current;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Fullscreen may be blocked; the overlay still shows
      });
    }
  }, [open]);

  // Listen for fullscreen exit (e.g. user presses Escape)
  useEffect(() => {
    if (!open) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onClose();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [open, onClose]);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  if (!open) return null;

  const nickname = profile?.nickname || t('profile.unnamed');

  // Resolve industry background labels (try i18n key first, fallback to raw value)
  const industryLabels = preferences?.industry_background
    ?.split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => {
      const i18nKey = `preferenceOptions.professionalBackground.${key}`;
      const translated = t(i18nKey);
      return translated === i18nKey ? key : translated;
    }) ?? [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
      onClick={handleClose}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 p-2 rounded-full text-white/40 hover:text-white/80 transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Name */}
      <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold text-white tracking-tight text-center px-8 select-none">
        {nickname}
      </h1>

      {/* Industry background */}
      {industryLabels.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-3 px-8">
          {industryLabels.map((label) => (
            <span
              key={label}
              className="px-4 py-1.5 rounded-full border border-white/20 text-white/60 text-lg sm:text-xl font-light select-none"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
