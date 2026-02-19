'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/context';

interface PreferenceCardProps {
  question: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
  multiSelect: boolean;
  i18nPrefix: string;
  onSkip: () => void;
}

export default function PreferenceCard({
  question,
  options,
  selected,
  onToggle,
  multiSelect,
  i18nPrefix,
  onSkip,
}: PreferenceCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold text-foreground mb-1">{question}</h2>
      <p className="text-sm text-muted-foreground mb-5">
        {multiSelect ? t('swipePreference.selectMultiple') : t('swipePreference.selectOne')}
      </p>

      <div className="flex-1 grid gap-2.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={cn(
                'w-full px-4 py-3.5 rounded-xl text-left text-sm font-medium border-2 transition-all touch-target touch-feedback',
                isSelected
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-foreground hover:border-primary/30'
              )}
            >
              {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('swipePreference.skip')}
      </button>
    </div>
  );
}
