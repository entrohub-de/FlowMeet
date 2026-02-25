'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Code, Briefcase, ArrowRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { upsertProfile, upsertPreferences, getProfile, getPreferences } from '@/lib/api/profile';
import { cn } from '@/lib/utils';
import {
  parsePreferenceString,
  serializePreferenceArray,
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  PROFESSIONAL_BACKGROUND_OPTIONS,
  STARTUP_STAGE_OPTIONS,
} from '@/lib/preference-options';
import AvatarUpload from '@/components/profile/AvatarUpload';
import ChipGroup from '@/components/profile/ChipGroup';

type IdentityType = 'engineering' | 'non_engineering';

function inferIdentity(industryBackground: string | null): IdentityType | null {
  if (!industryBackground) return null;
  return industryBackground.includes('engineer') ? 'engineering' : 'non_engineering';
}

export default function ProfileCompletePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [identity, setIdentity] = useState<IdentityType | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStartupStage, setSelectedStartupStage] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const [profile, prefs] = await Promise.all([
          getProfile(user.id),
          getPreferences(user.id),
        ]);
        if (profile) {
          setNickname(profile.nickname ?? '');
          setAvatarUrl(profile.avatar_url ?? null);
        }
        if (prefs) {
          const existing = parsePreferenceString(prefs.industry_background);
          const inferred = inferIdentity(prefs.industry_background);
          if (inferred) setIdentity(inferred);
          else if (existing.length > 0) setIdentity('non_engineering');

          const filterValid = (values: string[], options: readonly string[]) =>
            values.filter((v) => options.includes(v));
          setSelectedLanguages(filterValid(parsePreferenceString(prefs.languages), LANGUAGE_OPTIONS));
          setSelectedInterests(filterValid(parsePreferenceString(prefs.interests), INTEREST_OPTIONS));
          setSelectedIndustries(filterValid(parsePreferenceString(prefs.industry_background), PROFESSIONAL_BACKGROUND_OPTIONS));
          setSelectedStartupStage(
            STARTUP_STAGE_OPTIONS.includes(prefs.startup_stage as typeof STARTUP_STAGE_OPTIONS[number])
              ? (prefs.startup_stage ?? '')
              : ''
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const canGoNext = nickname.trim().length > 0 && identity !== null;

  const handleComplete = async () => {
    if (!user?.id || !canGoNext) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        nickname: nickname.trim(),
        gender: null,
        age_group: null,
      });

      const industryValues = [...selectedIndustries];
      if (identity === 'engineering' && !industryValues.includes('engineer')) {
        industryValues.unshift('engineer');
      }
      await upsertPreferences(user.id, {
        languages: serializePreferenceArray(selectedLanguages),
        interests: serializePreferenceArray(selectedInterests),
        industry_background: serializePreferenceArray(industryValues) || (identity === 'engineering' ? 'engineer' : 'other'),
        startup_stage: selectedStartupStage || null,
      });

      router.replace('/user');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  const identityCards: { type: IdentityType; label: string; icon: typeof Code; color: string; selectedBg: string; selectedBorder: string }[] = [
    {
      type: 'engineering',
      label: t('groupIdentity.engineering'),
      icon: Code,
      color: 'text-blue-600 dark:text-blue-400',
      selectedBg: 'bg-blue-500/10',
      selectedBorder: 'border-blue-500',
    },
    {
      type: 'non_engineering',
      label: t('groupIdentity.nonEngineering'),
      icon: Briefcase,
      color: 'text-emerald-600 dark:text-emerald-400',
      selectedBg: 'bg-emerald-500/10',
      selectedBorder: 'border-emerald-500',
    },
  ];

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex items-center justify-center p-4 bg-muted/30 overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent/[0.08] blur-[100px]" />

      <div className="relative w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {step === 1 ? t('profileCompletion.step1Title') : t('profileCompletion.step2Title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {step === 1 ? t('profileCompletion.subtitle') : t('profileCompletion.step2Subtitle')}
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-medium px-2 py-1 rounded-full bg-muted">
            {step}/2
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          <div className={cn('h-1 flex-1 rounded-full transition-colors', 'bg-primary')} />
          <div className={cn('h-1 flex-1 rounded-full transition-colors', step >= 2 ? 'bg-primary' : 'bg-muted')} />
        </div>

        {/* Step 1: Basic info */}
        {step === 1 && (
          <div className="bg-card/80 border border-border rounded-2xl shadow-lg backdrop-blur-sm p-6 space-y-6">
            {/* Avatar */}
            {user?.id && (
              <div className="flex justify-center">
                <AvatarUpload
                  userId={user.id}
                  avatarUrl={avatarUrl}
                  nickname={nickname}
                  size="lg"
                  onAvatarChange={setAvatarUrl}
                />
              </div>
            )}

            {/* Nickname */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="nickname">
                {t('profile.nickname')} <span className="text-destructive">*</span>
              </label>
              <input
                id="nickname"
                className="w-full h-12 px-4 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('profile.nicknamePlaceholder')}
                autoFocus
              />
            </div>

            {/* Identity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('groupIdentity.title')} <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {identityCards.map(({ type, label, icon: Icon, color, selectedBg, selectedBorder }) => {
                  const selected = identity === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setIdentity(type)}
                      className={cn(
                        'flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all',
                        selected
                          ? `${selectedBg} ${selectedBorder} shadow-sm`
                          : 'border-border bg-muted/30 hover:bg-muted/50'
                      )}
                    >
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                        selected ? selectedBg : 'bg-muted'
                      )}>
                        <Icon className={cn('w-4.5 h-4.5', selected ? color : 'text-muted-foreground')} />
                      </div>
                      <span className={cn('text-sm font-medium', selected ? color : 'text-muted-foreground')}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next button */}
            <button
              onClick={() => setStep(2)}
              disabled={!canGoNext}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {t('profileCompletion.next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="bg-card/80 border border-border rounded-2xl shadow-lg backdrop-blur-sm p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('profile.languages')}
              </label>
              <ChipGroup options={LANGUAGE_OPTIONS} selected={selectedLanguages} i18nPrefix="languages" onChange={(v) => setSelectedLanguages(v as string[])} editing />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('profile.interests')}
              </label>
              <ChipGroup options={INTEREST_OPTIONS} selected={selectedInterests} i18nPrefix="interests" onChange={(v) => setSelectedInterests(v as string[])} editing />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('profile.professionalBackground')}
              </label>
              <ChipGroup options={PROFESSIONAL_BACKGROUND_OPTIONS} selected={selectedIndustries} i18nPrefix="professionalBackground" onChange={(v) => setSelectedIndustries(v as string[])} editing />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                {t('profile.startupStage')}
              </label>
              <ChipGroup options={STARTUP_STAGE_OPTIONS} selected={selectedStartupStage} i18nPrefix="startupStages" onChange={(v) => setSelectedStartupStage(v as string)} editing multi={false} />
            </div>

            {/* Complete button */}
            <button
              onClick={handleComplete}
              disabled={saving}
              className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? t('profile.saving') : t('profileCompletion.complete')}
              <Check className="w-4 h-4" />
            </button>

            {/* Skip */}
            <button
              type="button"
              onClick={handleComplete}
              disabled={saving}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {t('profileCompletion.skipPreferences')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
