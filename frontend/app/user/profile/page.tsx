'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';
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

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [nickname, setNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStartupStage, setSelectedStartupStage] = useState('');

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBasicEditing, setIsBasicEditing] = useState(false);
  const [isPrefsEditing, setIsPrefsEditing] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  const loadData = useCallback(async (userId: string) => {
    try {
      const [profile, prefs] = await Promise.all([
        getProfile(userId),
        getPreferences(userId),
      ]);
      if (profile) {
        setNickname(profile.nickname ?? '');
        setAvatarUrl(profile.avatar_url ?? null);
        setGender(profile.gender ?? '');
        setAgeGroup(profile.age_group ?? '');
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
          userId={user?.id}
          nickname={nickname}
          avatarUrl={avatarUrl}
          gender={gender}
          ageGroup={ageGroup}
          email={user?.email}
          isEditing={isBasicEditing}
          saving={saving}
          onEditToggle={() => setIsBasicEditing(true)}
          onSave={handleSave}
          onNicknameChange={setNickname}
          onGenderChange={setGender}
          onAgeGroupChange={setAgeGroup}
          onAvatarChange={setAvatarUrl}
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
