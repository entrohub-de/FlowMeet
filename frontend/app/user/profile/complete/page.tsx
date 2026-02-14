'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, ChevronRight, ChevronLeft, Check, Globe, Heart, Briefcase, Rocket } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { upsertProfile, upsertPreferences, getProfile, getPreferences } from '@/lib/api/profile';
import { cn } from '@/lib/utils';
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  PROFESSIONAL_BACKGROUND_OPTIONS,
  STARTUP_STAGE_OPTIONS,
  parsePreferenceString,
  serializePreferenceArray,
} from '@/lib/preference-options';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
const AGE_GROUP_OPTIONS = ['18-24', '25-34', '35-44', '45+'] as const;

export default function ProfileCompletePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Step 1: Basic info
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');

  // Step 2: Preferences (optional)
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
          setGender(profile.gender ?? '');
          setAgeGroup(profile.age_group ?? '');
        }
        if (prefs) {
          setSelectedLanguages(parsePreferenceString(prefs.languages));
          setSelectedInterests(parsePreferenceString(prefs.interests));
          setSelectedIndustries(parsePreferenceString(prefs.industry_background));
          setSelectedStartupStage(prefs.startup_stage ?? '');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const canProceedStep1 = nickname.trim().length > 0;

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleComplete = async () => {
    if (!user?.id || !canProceedStep1) return;
    setSaving(true);
    try {
      await upsertProfile(user.id, {
        nickname: nickname.trim(),
        gender: gender || null,
        age_group: ageGroup || null,
      });

      const hasPrefs = selectedLanguages.length > 0 || selectedInterests.length > 0 ||
        selectedIndustries.length > 0 || selectedStartupStage;
      if (hasPrefs) {
        await upsertPreferences(user.id, {
          languages: serializePreferenceArray(selectedLanguages),
          interests: serializePreferenceArray(selectedInterests),
          industry_background: serializePreferenceArray(selectedIndustries),
          startup_stage: selectedStartupStage || null,
        });
      }

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

  const chipClass = (selected: boolean) =>
    cn(
      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer hover:bg-primary/5',
      selected
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-muted/50 text-muted-foreground border-transparent'
    );

  const renderChipGroup = (
    options: readonly string[],
    selected: string[],
    i18nPrefix: string,
    setter: (v: string[]) => void
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggleItem(selected, opt, setter)}
          className={chipClass(selected.includes(opt))}
        >
          {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
        </button>
      ))}
    </div>
  );

  const renderSingleChipGroup = (
    options: readonly string[],
    selected: string,
    i18nPrefix: string,
    setter: (v: string) => void
  ) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setter(selected === opt ? '' : opt)}
          className={chipClass(selected === opt)}
        >
          {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-60px)] flex items-center justify-center p-4 bg-muted/30">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('profileCompletion.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('profileCompletion.subtitle')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {step > 1 ? <Check className="w-4 h-4" /> : '1'}
          </div>
          <div className={`w-12 h-0.5 ${step > 1 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            2
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                {t('profileCompletion.step1Title')}
              </h2>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="nickname">
                  {t('profile.nickname')} <span className="text-destructive">*</span>
                </label>
                <input
                  id="nickname"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('profile.nicknamePlaceholder')}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.gender')}
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">{t('profile.genderOptions.unset')}</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{t(`profile.genderOptions.${g}`)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.ageGroup')}
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                  >
                    <option value="">{t('profile.ageGroupOptions.unset')}</option>
                    {AGE_GROUP_OPTIONS.map((a) => (
                      <option key={a} value={a}>{t(`profile.ageGroupOptions.${a}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {t('profileCompletion.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">
                {t('profileCompletion.step2Title')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('profileCompletion.step2Subtitle')}
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    {t('profile.languages')}
                  </label>
                  {renderChipGroup(LANGUAGE_OPTIONS, selectedLanguages, 'languages', setSelectedLanguages)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {t('profile.interests')}
                  </label>
                  {renderChipGroup(INTEREST_OPTIONS, selectedInterests, 'interests', setSelectedInterests)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {t('profile.professionalBackground')}
                  </label>
                  {renderChipGroup(PROFESSIONAL_BACKGROUND_OPTIONS, selectedIndustries, 'professionalBackground', setSelectedIndustries)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Rocket className="w-3.5 h-3.5" />
                    {t('profile.startupStage')}
                  </label>
                  {renderSingleChipGroup(STARTUP_STAGE_OPTIONS, selectedStartupStage, 'startupStages', setSelectedStartupStage)}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-border text-foreground rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.back')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={saving || !canProceedStep1}
                  className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? t('profile.saving') : t('profileCompletion.complete')}
                  <Check className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleComplete}
                disabled={saving}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('profileCompletion.skipPreferences')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
