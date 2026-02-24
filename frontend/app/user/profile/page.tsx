'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';
import { getUserRole, applyForHost, getHostApplication, type UserRole, type HostApplication } from '@/lib/api/role';
import { uploadUserAvatar } from '@/lib/api/storage';
import { toast } from 'sonner';
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  PROFESSIONAL_BACKGROUND_OPTIONS,
  STARTUP_STAGE_OPTIONS,
  parsePreferenceString,
  serializePreferenceArray,
} from '@/lib/preference-options';
import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard';
import PreferencesCard from '@/components/profile/PreferencesCard';
import RoleUpgradeCard from '@/components/profile/RoleUpgradeCard';

function getGreeting(nickname: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return t('profile.greeting.morning', { name: nickname });
  if (hour >= 12 && hour < 18) return t('profile.greeting.afternoon', { name: nickname });
  if (hour >= 18 && hour < 24) return t('profile.greeting.evening', { name: nickname });
  return t('profile.greeting.lateNight', { name: nickname });
}

function getProfileCompleteness(
  nickname: string,
  gender: string,
  ageGroup: string,
  avatarUrl: string | null,
  selectedLanguages: string[],
  selectedInterests: string[],
  selectedIndustries: string[],
  selectedStartupStage: string,
): number {
  let score = 0;
  if (nickname.trim()) score += 20;
  if (gender) score += 10;
  if (ageGroup) score += 10;
  if (avatarUrl) score += 10;
  const hasPrefs = selectedLanguages.length > 0 || selectedInterests.length > 0 ||
    selectedIndustries.length > 0 || selectedStartupStage;
  if (hasPrefs) score += 50;
  return score;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStartupStage, setSelectedStartupStage] = useState('');

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBasicEditing, setIsBasicEditing] = useState(false);
  const [isPrefsEditing, setIsPrefsEditing] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const [userRole, setUserRole] = useState<UserRole>('user');
  const [hostApplication, setHostApplication] = useState<HostApplication | null>(null);
  const [applying, setApplying] = useState(false);

  const loadData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs, role, application] = await Promise.all([
        getProfile(userId),
        getPreferences(userId),
        getUserRole(userId),
        getHostApplication(userId),
      ]);
      if (profile) {
        setNickname(profile.nickname ?? '');
        setGender(profile.gender ?? '');
        setAgeGroup(profile.age_group ?? '');
        setAvatarUrl(profile.avatar_url ?? null);
      }
      if (prefs) {
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
      setUserRole(role);
      setHostApplication(application);
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
      await upsertProfile(user.id, {
        nickname: nickname || null,
        gender: gender || null,
        age_group: ageGroup || null,
      });
      toast.success(t('profile.saved'));
      setIsBasicEditing(false);
    } catch {
      toast.error(t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrefs = async () => {
    if (!user?.id) return;
    setPrefsSaving(true);
    try {
      await upsertPreferences(user.id, {
        languages: serializePreferenceArray(selectedLanguages),
        interests: serializePreferenceArray(selectedInterests),
        industry_background: serializePreferenceArray(selectedIndustries),
        startup_stage: selectedStartupStage || null,
      });
      toast.success(t('profile.saved'));
      setIsPrefsEditing(false);
    } catch (err) {
      console.error('[SavePrefs]', err);
      toast.error(t('profile.saveFailed'));
    } finally {
      setPrefsSaving(false);
    }
  };

  const handleApplyForHost = async () => {
    if (!user?.id) return;
    setApplying(true);
    try {
      const result = await applyForHost(user.id);
      if (result.success) {
        toast.success(t('profile.roleUpgrade.applied'));
        setHostApplication({ id: '', user_id: user.id, status: 'pending', created_at: new Date().toISOString(), reviewed_at: null, reviewed_by: null });
      } else if (result.error === 'already_applied') {
        toast.info(t('profile.roleUpgrade.alreadyApplied'));
      } else {
        toast.error(result.error || t('profile.roleUpgrade.error'));
      }
    } catch {
      toast.error(t('profile.roleUpgrade.error'));
    } finally {
      setApplying(false);
    }
  };

  const handleReapply = async () => {
    toast.info(t('profile.roleUpgrade.reapplyHint'));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    try {
      const url = await uploadUserAvatar(file, user.id);
      await upsertProfile(user.id, { avatar_url: url });
      setAvatarUrl(url);
    } catch (err) {
      console.error('[Avatar] upload failed:', err);
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setAvatarUploading(false);
    }
  };

  const completeness = useMemo(
    () => getProfileCompleteness(nickname, gender, ageGroup, avatarUrl, selectedLanguages, selectedInterests, selectedIndustries, selectedStartupStage),
    [nickname, gender, ageGroup, avatarUrl, selectedLanguages, selectedInterests, selectedIndustries, selectedStartupStage]
  );

  const greeting = useMemo(
    () => nickname ? getGreeting(nickname, t) : '',
    [nickname, t]
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-lg px-4">
          <div className="h-24 bg-muted rounded-2xl" />
          <div className="h-40 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-accent/[0.08] blur-[100px]" />

      <div className="max-w-lg mx-auto space-y-4 relative z-10">
        <ProfileHeaderCard
          nickname={nickname}
          gender={gender}
          ageGroup={ageGroup}
          avatarUrl={avatarUrl}
          avatarUploading={avatarUploading}
          userRole={userRole}
          email={user?.email}
          completeness={completeness}
          isEditing={isBasicEditing}
          saving={saving}
          onEditToggle={() => setIsBasicEditing(true)}
          onSave={handleSave}
          onNicknameChange={setNickname}
          onGenderChange={setGender}
          onAgeGroupChange={setAgeGroup}
          onAvatarChange={handleAvatarChange}
        />

        <PreferencesCard
          selectedLanguages={selectedLanguages}
          selectedInterests={selectedInterests}
          selectedIndustries={selectedIndustries}
          selectedStartupStage={selectedStartupStage}
          isEditing={isPrefsEditing}
          saving={prefsSaving}
          onLanguagesChange={setSelectedLanguages}
          onInterestsChange={setSelectedInterests}
          onIndustriesChange={setSelectedIndustries}
          onStartupStageChange={setSelectedStartupStage}
          onEditToggle={() => setIsPrefsEditing(!isPrefsEditing)}
          onSave={handleSavePrefs}
        />

      </div>
    </div>
  );
}
