'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getProfile, upsertProfile, getPreferences, upsertPreferences } from '@/lib/api/profile';
import { getUserRole, applyForHost, getHostApplication, type UserRole, type HostApplication } from '@/lib/api/role';
import { uploadUserAvatar } from '@/lib/api/storage';
import { Crown, User, Pencil, Check, Mail, Globe, Heart, Briefcase, Rocket, ChevronDown, Camera, Loader2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isBasicEditing, setIsBasicEditing] = useState(false);
  const [isPrefsExpanded, setIsPrefsExpanded] = useState(false);
  const [isPrefsEditing, setIsPrefsEditing] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Role & application states
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

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

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
    if (!user?.id) return;
    // Delete old application first, then re-apply
    // Since we have a UNIQUE constraint, we need to delete first
    // But RLS doesn't allow user DELETE — so we handle this by upserting via the insert with ON CONFLICT
    // Actually the table has UNIQUE(user_id) so re-insert won't work.
    // For reapply, we'll just show a message — admin needs to handle this,
    // or we can use the existing record. Let's just toast for now.
    toast.info(t('profile.roleUpgrade.reapplyHint'));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setAvatarUploading(true);
    try {
      console.log('[Avatar] uploading', file.name, file.type, file.size);
      const url = await uploadUserAvatar(file, user.id);
      console.log('[Avatar] uploaded, url:', url);
      await upsertProfile(user.id, { avatar_url: url });
      setAvatarUrl(url);
    } catch (err) {
      console.error('[Avatar] upload failed:', err);
      toast.error(t('profile.avatarUploadFailed'));
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
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

  const inputClass = isBasicEditing
    ? 'w-full px-3 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors'
    : 'w-full px-3 py-2.5 bg-muted/50 border border-transparent rounded-xl text-sm text-foreground cursor-default';

  const chipClass = (selected: boolean) =>
    cn(
      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
      selected
        ? 'bg-primary/10 text-primary border-primary/30'
        : 'bg-muted/50 text-muted-foreground border-transparent',
      isPrefsEditing && 'cursor-pointer hover:bg-primary/5',
      !isPrefsEditing && 'cursor-default'
    );

  /** Render a multi-select chip group */
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
          disabled={!isPrefsEditing}
          onClick={() => isPrefsEditing && toggleItem(selected, opt, setter)}
          className={chipClass(selected.includes(opt))}
        >
          {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
        </button>
      ))}
    </div>
  );

  /** Render a single-select chip group */
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
          disabled={!isPrefsEditing}
          onClick={() => isPrefsEditing && setter(selected === opt ? '' : opt)}
          className={chipClass(selected === opt)}
        >
          {t(`preferenceOptions.${i18nPrefix}.${opt}`)}
        </button>
      ))}
    </div>
  );

  // Determine application state for the role upgrade section
  const applicationStatus = hostApplication?.status ?? null;

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Profile Header Card */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center relative">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            disabled={avatarUploading || !isEditing}
            onClick={() => isEditing && avatarInputRef.current?.click()}
            className={cn(
              'w-20 h-20 rounded-full mx-auto mb-3 relative overflow-hidden group',
              isEditing && 'cursor-pointer',
              !isEditing && 'cursor-default'
            )}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
            )}
            {isEditing && !avatarUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-5 h-5 text-white" />
              </div>
            )}
            {avatarUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </button>
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t('profile.basicInfo')}
            </h2>
            <button
              type="button"
              onClick={() => setIsBasicEditing(!isBasicEditing)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {isBasicEditing ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <Pencil className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </div>

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
                readOnly={!isBasicEditing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('profile.gender')}</label>
                {isBasicEditing ? (
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
                {isBasicEditing ? (
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

          {isBasicEditing && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback text-sm"
            >
              <Check className="w-4 h-4" />
              {saving ? t('profile.saving') : t('profile.save')}
            </button>
          )}
        </div>

        {/* Preferences Card — collapsible & independently editable */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (isPrefsExpanded) setIsPrefsEditing(false);
                setIsPrefsExpanded(!isPrefsExpanded);
              }}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <Heart className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t('profile.preferences')}
              </h2>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform duration-200',
                  isPrefsExpanded && 'rotate-180'
                )}
              />
            </button>

            {isPrefsExpanded && (
              <button
                type="button"
                onClick={() => setIsPrefsEditing(!isPrefsEditing)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                {isPrefsEditing ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {isPrefsExpanded && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {t('profile.languages')}
                </label>
                {renderChipGroup(LANGUAGE_OPTIONS, selectedLanguages, 'languages', setSelectedLanguages)}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {t('profile.interests')}
                </label>
                {renderChipGroup(INTEREST_OPTIONS, selectedInterests, 'interests', setSelectedInterests)}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  {t('profile.professionalBackground')}
                </label>
                {renderChipGroup(PROFESSIONAL_BACKGROUND_OPTIONS, selectedIndustries, 'professionalBackground', setSelectedIndustries)}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Rocket className="w-3 h-3" />
                  {t('profile.startupStage')}
                </label>
                {renderSingleChipGroup(STARTUP_STAGE_OPTIONS, selectedStartupStage, 'startupStages', setSelectedStartupStage)}
              </div>

              {isPrefsEditing && (
                <button
                  onClick={handleSavePrefs}
                  disabled={prefsSaving}
                  className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback text-sm"
                >
                  <Check className="w-4 h-4" />
                  {prefsSaving ? t('profile.saving') : t('profile.save')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Role Upgrade Section — Application-based */}
        {userRole === 'user' && !applicationStatus && (
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
              onClick={handleApplyForHost}
              disabled={applying}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
            >
              <Crown className="w-4 h-4" />
              {applying ? t('profile.roleUpgrade.applying') : t('profile.roleUpgrade.applyToHost')}
            </button>
          </div>
        )}

        {/* Pending Application */}
        {userRole === 'user' && applicationStatus === 'pending' && (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.pendingTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.pendingDescription')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rejected Application */}
        {userRole === 'user' && applicationStatus === 'rejected' && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('profile.roleUpgrade.rejectedTitle')}</h3>
                <p className="text-xs text-muted-foreground">{t('profile.roleUpgrade.rejectedDescription')}</p>
              </div>
            </div>
            <button
              onClick={handleReapply}
              className="w-full px-4 py-2.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-2 touch-feedback text-sm"
            >
              {t('profile.roleUpgrade.reapply')}
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
