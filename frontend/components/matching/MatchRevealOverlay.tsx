'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import type { Profile } from '@/types/domain';

type RevealPhase = 'revealing' | 'showing_score' | 'showing_reasons' | 'done';

interface MatchRevealOverlayProps {
  myNickname: string;
  partner: {
    profile: Profile | null;
    matchId: string;
  };
  score: number | null;
  reasons: string[] | null;
  onComplete: () => void;
}

export default function MatchRevealOverlay({
  myNickname,
  partner,
  score,
  reasons,
  onComplete,
}: MatchRevealOverlayProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<RevealPhase>('revealing');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('showing_score'), 800));
    timers.push(setTimeout(() => setPhase('showing_reasons'), 1600));
    timers.push(setTimeout(() => setPhase('done'), 2500));
    timers.push(setTimeout(() => onComplete(), 2800));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const myInitial = myNickname?.[0] || '?';
  const partnerInitial = partner.profile?.nickname?.[0] || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center px-6 max-w-sm mx-auto">
        {/* Avatars */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center ring-2 ring-primary/30 transition-transform duration-700 ${
              phase === 'revealing' ? '-translate-x-8' : 'translate-x-0'
            }`}
          >
            <span className="text-2xl font-bold text-primary">{myInitial}</span>
          </div>

          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br from-accent/40 to-accent/20 flex items-center justify-center ring-2 ring-accent/30 transition-transform duration-700 ${
              phase === 'revealing' ? 'translate-x-8' : 'translate-x-0'
            }`}
          >
            <span className="text-2xl font-bold text-foreground">{partnerInitial}</span>
          </div>
        </div>

        {/* Match success text */}
        <h2
          className={`text-2xl font-extrabold text-primary transition-opacity duration-300 ${
            phase !== 'revealing' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t('matchReveal.success')}
        </h2>

        {/* Score */}
        {score !== null && (
          <div
            className={`mt-3 text-4xl font-extrabold text-primary transition-all duration-300 ${
              phase === 'showing_score' || phase === 'showing_reasons' || phase === 'done'
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-75'
            }`}
          >
            {score}%
          </div>
        )}

        {/* Reasons */}
        {reasons && reasons.length > 0 && (
          <div
            className={`mt-4 flex flex-wrap gap-2 justify-center transition-all duration-300 ${
              phase === 'showing_reasons' || phase === 'done'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            {reasons.map((reason, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Partner name */}
        <p
          className={`mt-4 text-lg font-semibold text-foreground transition-opacity duration-300 ${
            phase !== 'revealing' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {partner.profile?.nickname || t('user.anonymous')}
        </p>
      </div>
    </div>
  );
}
