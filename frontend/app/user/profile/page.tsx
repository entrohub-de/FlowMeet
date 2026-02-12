'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';
import { getUserRole, upgradeToHost, type UserRole } from '@/lib/api/role';
import { Crown } from 'lucide-react';

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

  // Role upgrade states
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState<'idle' | 'success' | 'error' | 'already-host'>('idle');
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs, role] = await Promise.all([
        getProfile(userId),
        getPreferences(userId),
        getUserRole(userId),
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
      setUserRole(role);
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

  const handleUpgradeToHost = async () => {
    if (!user?.id) return;
    setUpgrading(true);
    setUpgradeStatus('idle');
    setUpgradeError(null);

    try {
      const result = await upgradeToHost(user.id);

      if (result.success) {
        setUpgradeStatus('success');
        setUserRole('host');
        setTimeout(() => {
          // Redirect to host dashboard after successful upgrade
          window.location.href = '/host';
        }, 1500);
      } else {
        if (result.error?.includes('already')) {
          setUpgradeStatus('already-host');
        } else {
          setUpgradeStatus('error');
          setUpgradeError(result.error || t('profile.roleUpgrade.error'));
        }
      }
    } catch {
      setUpgradeStatus('error');
      setUpgradeError(t('profile.roleUpgrade.error'));
    } finally {
      setUpgrading(false);
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

        {/* Role Upgrade Section */}
        {userRole === 'user' && (
          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
              {t('profile.roleUpgrade.title')}
            </h2>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Crown className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {t('profile.roleUpgrade.currentRole')}
                    </div>
                    <div className="text-base font-medium text-foreground">
                      {t(`profile.roleUpgrade.roles.${userRole}`)}
                    </div>
                  </div>

                  <p className="text-sm text-foreground">
                    {t('profile.roleUpgrade.upgradeDescription')}
                  </p>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      {t('profile.roleUpgrade.benefits.title')}
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {t('profile.roleUpgrade.benefits.createEvents')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {t('profile.roleUpgrade.benefits.manageSignups')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {t('profile.roleUpgrade.benefits.checkin')}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {t('profile.roleUpgrade.benefits.viewStats')}
                      </li>
                    </ul>
                  </div>

                  {upgradeStatus === 'success' && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-foreground">
                        {t('profile.roleUpgrade.upgraded')}
                      </p>
                    </div>
                  )}

                  {upgradeStatus === 'already-host' && (
                    <div className="p-3 bg-secondary border border-border rounded-lg">
                      <p className="text-sm text-foreground">
                        {t('profile.roleUpgrade.alreadyHost')}
                      </p>
                    </div>
                  )}

                  {upgradeStatus === 'error' && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">
                        {upgradeError || t('profile.roleUpgrade.error')}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleUpgradeToHost}
                    disabled={upgrading || upgradeStatus === 'success'}
                    className="w-full px-button h-button bg-primary text-primary-foreground rounded-button font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    {upgrading
                      ? t('profile.roleUpgrade.upgrading')
                      : upgradeStatus === 'success'
                      ? t('profile.roleUpgrade.upgraded')
                      : t('profile.roleUpgrade.upgradeToHost')}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Current Role Display for Hosts/Admins */}
        {(userRole === 'host' || userRole === 'admin') && (
          <section className="space-y-4 border-t border-border pt-8">
            <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
              {t('profile.roleUpgrade.title')}
            </h2>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    {t('profile.roleUpgrade.currentRole')}
                  </div>
                  <div className="text-lg font-medium text-foreground">
                    {t(`profile.roleUpgrade.roles.${userRole}`)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-button h-button bg-primary text-primary-foreground rounded-button font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t('profile.saving') : saveStatus === 'saved' ? t('profile.saved') : t('profile.save')}
        </button>
      </div>
    </div>
  );
}
