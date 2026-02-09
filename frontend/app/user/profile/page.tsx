'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';

const GENDER_OPTIONS = ['male', 'female', 'other'] as const;
const AGE_GROUP_OPTIONS = ['18-24', '25-34', '35-44', '45+'] as const;

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [languages, setLanguages] = useState('');
  const [interests, setInterests] = useState('');
  const [purpose, setPurpose] = useState('');
  const [industryBackground, setIndustryBackground] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs] = await Promise.all([
        getProfile(userId),
        getPreferences(userId),
      ]);
      if (profile) {
        setNickname(profile.nickname ?? '');
        setGender(profile.gender ?? '');
        setAgeGroup(profile.age_group ?? '');
      }
      if (prefs) {
        setLanguages(prefs.languages ?? '');
        setInterests(prefs.interests ?? '');
        setPurpose(prefs.purpose ?? '');
        setIndustryBackground(prefs.industry_background ?? '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) loadData(user.id);
  }, [user?.id, loadData]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    setSaveStatus('idle');
    try {
      await Promise.all([
        upsertProfile(user.id, {
          nickname: nickname || null,
          gender: gender || null,
          age_group: ageGroup || null,
        }),
        upsertPreferences(user.id, {
          languages: languages || null,
          interests: interests || null,
          purpose: purpose || null,
          industry_background: industryBackground || null,
        }),
      ]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">
        {t('profile.title')}
      </h1>

      <div className="space-y-8">
        {/* Basic Info */}
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('profile.email')}</label>
            <input
              className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm text-muted-foreground cursor-not-allowed"
              value={user?.email ?? ''}
              disabled
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="nickname">
              {t('profile.nickname')}
            </label>
            <input
              id="nickname"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('profile.nicknamePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('profile.gender')}</label>
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
              <label className="text-sm font-medium text-foreground">{t('profile.ageGroup')}</label>
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
        </section>

        {/* Preferences */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
            {t('profile.preferences')}
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="languages">
              {t('profile.languages')}
            </label>
            <input
              id="languages"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder={t('profile.languagesPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="interests">
              {t('profile.interests')}
            </label>
            <input
              id="interests"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder={t('profile.interestsPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="purpose">
              {t('profile.purpose')}
            </label>
            <input
              id="purpose"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={t('profile.purposePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="industry">
              {t('profile.industryBackground')}
            </label>
            <input
              id="industry"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={industryBackground}
              onChange={(e) => setIndustryBackground(e.target.value)}
              placeholder={t('profile.industryBackgroundPlaceholder')}
            />
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('profile.saving') : saveStatus === 'saved' ? t('profile.saved') : t('profile.save')}
        </button>
      </div>
    </div>
  );
}
