'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n/context';

interface CandidateHint {
  industry_background: string | null;
}

interface AnonymousCandidateHintsProps {
  otherUserIds: string[];
}

export default function AnonymousCandidateHints({ otherUserIds }: AnonymousCandidateHintsProps) {
  const { t } = useTranslation();
  const [hints, setHints] = useState<CandidateHint[]>([]);

  useEffect(() => {
    if (otherUserIds.length === 0) return;

    const fetchHints = async () => {
      const { data } = await supabase
        .from('usr_preferences')
        .select('industry_background')
        .in('user_id', otherUserIds.slice(0, 5));

      if (data) {
        setHints(data.filter((d) => d.industry_background).slice(0, 3));
      }
    };

    fetchHints();
  }, [otherUserIds]);

  if (hints.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>{t('matchReveal.candidatesNearby')}</span>
      </div>
      <div className="flex gap-2">
        {hints.map((hint, idx) => {
          const tags = hint.industry_background
            ?.split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 2) ?? [];

          return (
            <div
              key={idx}
              className="flex-1 bg-muted/60 rounded-lg p-3 blur-[1px] hover:blur-none transition-all duration-300"
            >
              <div className="w-8 h-8 rounded-full bg-muted mx-auto mb-1.5" />
              <div className="text-center space-y-1">
                {tags.map((tag, i) => (
                  <span
                    key={i}
                    className="block text-[10px] text-muted-foreground truncate"
                  >
                    {t(`preferenceOptions.professionalBackground.${tag}`)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
