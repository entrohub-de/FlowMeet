'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';
import { getUserRole, upgradeToHost, type UserRole } from '@/lib/api/role';
import { Crown, User, Pencil, Check, Mail, Globe, Heart, Briefcase, Target } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Role upgrade states
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [upgrading, setUpgrading] = useState(false);

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
      toast.success(t('profile.saved'));
      setIsEditing(false);
    } catch {
      toast.error(t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpgradeToHost = async () => {
    if (!user?.id) return;
    setUpgrading(true);
    try {
      const result = await upgradeToHost(user.id);
      if (result.success) {
        toast.success(t('profile.roleUpgrade.upgraded'));
        setUserRole('host');
        setTimeout(() => { window.location.href = '/host'; }, 1500);
      } else if (result.error?.includes('already')) {
        toast.info(t('profile.roleUpgrade.alreadyHost'));
      } else {
        toast.error(result.error || t('profile.roleUpgrade.error'));
      }
    } catch {
      toast.error(t('profile.roleUpgrade.error'));
    } finally {
      setUpgrading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-lg px-4">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-40 bg-muted rounded-xl" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const inputClass = isEditing
    ? 'w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
    : 'w-full px-3 py-2.5 bg-muted/50 border border-transparent rounded-xl text-sm text-foreground cursor-default';

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Profile Header Card */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center relative">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            {nickname || t('profile.unnamed')}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <Crown className="w-3 h-3" />
              {t(`profile.roleUpgrade.roles.${userRole}`)}
            </span>
            {gender && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {t(`profile.genderOptions.${gender}`)}
              </span>
            )}
            {ageGroup && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                {ageGroup}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" />
            {user?.email}
          </p>

          {/* Edit toggle */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-muted transition-colors touch-feedback"
          >
            {isEditing ? (
              <Check className="w-5 h-5 text-primary" />
            ) : (
              <Pencil className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Basic Info Card */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {t('profile.basicInfo')}
          </h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="nickname">
                {t('profile.nickname')}
              </label>
              <input
                id="nickname"
                className={inputClass}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t('profile.nicknamePlaceholder')}
                readOnly={!isEditing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('profile.gender')}</label>
                {isEditing ? (
                  <select
                    className={inputClass}
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value="">{t('profile.genderOptions.unset')}</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>{t(`profile.genderOptions.${g}`)}</option>
                    ))}
                  </select>
                ) : (
                  <div className={inputClass}>
                    {gender ? t(`profile.genderOptions.${gender}`) : t('profile.genderOptions.unset')}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('profile.ageGroup')}</label>
                {isEditing ? (
                  <select
                    className={inputClass}
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                  >
                    <option value="">{t('profile.ageGroupOptions.unset')}</option>
                    {AGE_GROUP_OPTIONS.map((a) => (
                      <option key={a} value={a}>{t(`profile.ageGroupOptions.${a}`)}</option>
                    ))}
                  </select>
                ) : (
                  <div className={inputClass}>
                    {ageGroup ? t(`profile.ageGroupOptions.${ageGroup}`) : t('profile.ageGroupOptions.unset')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Card */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" />
            {t('profile.preferences')}
          </h2>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1" htmlFor="languages">
                <Globe className="w-3 h-3" />
                {t('profile.languages')}
              </label>
              <input
                id="languages"
                className={inputClass}
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder={t('profile.languagesPlaceholder')}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1" htmlFor="interests">
                <Heart className="w-3 h-3" />
                {t('profile.interests')}
              </label>
              <input
                id="interests"
                className={inputClass}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder={t('profile.interestsPlaceholder')}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1" htmlFor="purpose">
                <Target className="w-3 h-3" />
                {t('profile.purpose')}
              </label>
              <input
                id="purpose"
                className={inputClass}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder={t('profile.purposePlaceholder')}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1" htmlFor="industry">
                <Briefcase className="w-3 h-3" />
                {t('profile.industryBackground')}
              </label>
              <input
                id="industry"
                className={inputClass}
                value={industryBackground}
                onChange={(e) => setIndustryBackground(e.target.value)}
                placeholder={t('profile.industryBackgroundPlaceholder')}
                readOnly={!isEditing}
              />
            </div>
          </div>
        </div>

        {/* Save Button (only in edit mode) */}
        {isEditing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-2xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
          >
            <Check className="w-4 h-4" />
            {saving ? t('profile.saving') : t('profile.save')}
          </button>
        )}

        {/* Role Upgrade Section */}
        {userRole === 'user' && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.upgradeDescription')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t('profile.roleUpgrade.benefits.createEvents')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t('profile.roleUpgrade.benefits.manageSignups')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t('profile.roleUpgrade.benefits.checkin')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {t('profile.roleUpgrade.benefits.viewStats')}
              </div>
            </div>

            <button
              onClick={handleUpgradeToHost}
              disabled={upgrading}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
            >
              <Crown className="w-4 h-4" />
              {upgrading ? t('profile.roleUpgrade.upgrading') : t('profile.roleUpgrade.upgradeToHost')}
            </button>
          </div>
        )}

        {/* Current Role Display for Hosts/Admins */}
        {(userRole === 'host' || userRole === 'admin') && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('profile.roleUpgrade.currentRole')}</div>
                <div className="font-semibold text-foreground">{t(`profile.roleUpgrade.roles.${userRole}`)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
