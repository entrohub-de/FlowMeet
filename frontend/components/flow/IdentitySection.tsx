'use client';

import { Code, Briefcase } from 'lucide-react';
import type { IdentityType } from '@/hooks/useGroupIdentity';

const IDENTITY_COLORS: Record<IdentityType, { bg: string; border: string; text: string }> = {
  engineering: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  non_engineering: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
};

interface IdentitySectionProps {
  t: (key: string) => string;
  state: { myIdentity: IdentityType | null };
  onSelect: (id: IdentityType) => void;
}

export function IdentitySection({ t, state, onSelect }: IdentitySectionProps) {
  const selected = state.myIdentity;
  const selectedColors = selected ? IDENTITY_COLORS[selected] : null;

  // After selection: show a large color beacon
  if (selected && selectedColors) {
    const Icon = selected === 'engineering' ? Code : Briefcase;
    const label = selected === 'engineering'
      ? t('groupIdentity.engineering')
      : t('groupIdentity.nonEngineering');

    return (
      <div
        className={`rounded-2xl border-2 ${selectedColors.border} ${selectedColors.bg} p-8 text-center space-y-4 transition-all duration-500`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full ${selectedColors.bg} flex items-center justify-center`}>
          <Icon className={`w-10 h-10 ${selectedColors.text}`} />
        </div>
        <p className={`text-xl font-bold ${selectedColors.text}`}>{label}</p>
        <button
          onClick={() => onSelect(selected === 'engineering' ? 'non_engineering' : 'engineering')}
          className="mt-2 px-5 py-2 rounded-full text-sm font-medium text-foreground border border-border bg-white shadow-sm hover:shadow-md transition-all"
        >
          {t('groupIdentity.switchIdentity')}
        </button>
      </div>
    );
  }

  // Before selection: show choice cards
  const cards: { type: IdentityType; label: string; icon: typeof Code }[] = [
    { type: 'engineering', label: t('groupIdentity.engineering'), icon: Code },
    { type: 'non_engineering', label: t('groupIdentity.nonEngineering'), icon: Briefcase },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold">{t('groupIdentity.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('groupIdentity.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ type, label, icon: Icon }) => {
          const colors = IDENTITY_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-current transition-all touch-feedback hover:shadow-sm"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg}`}>
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
