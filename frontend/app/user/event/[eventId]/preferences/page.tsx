'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, SkipForward, Target } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getMatchPreference, saveMatchPreference } from '@/lib/api/matching';
import { getPreferences, upsertPreferences } from '@/lib/api/profile';
import FamiliarFaces from '@/components/matching/FamiliarFaces';
import { cn } from '@/lib/utils';
import {
  LANGUAGE_OPTIONS,
  INTEREST_OPTIONS,
  PROFESSIONAL_BACKGROUND_OPTIONS,
  STARTUP_STAGE_OPTIONS,
  NETWORKING_INTENT_OPTIONS,
  parsePreferenceString,
  serializePreferenceArray,
} from '@/lib/preference-options';

export default function EventPreferencesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Event-specific preferences
  const [preferredTopics, setPreferredTopics] = useState('');
  const [availability, setAvailability] = useState('');
  const [notes, setNotes] = useState('');
  const [networkingIntent, setNetworkingIntent] = useState('');

  // Global preferences (show only if not filled)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStartupStage, setSelectedStartupStage] = useState('');
  const [hasGlobalPrefs, setHasGlobalPrefs] = useState(false);

  useEffect(() => {
    if (!user?.id || !eventId) return;
    const load = async () => {
      try {
        const [matchPref, globalPrefs] = await Promise.all([
          getMatchPreference(eventId, user.id),
          getPreferences(user.id),
        ]);

        if (matchPref) {
          setPreferredTopics(matchPref.preferred_topics ?? '');
          setAvailability(matchPref.availability ?? '');
          setNotes(matchPref.notes ?? '');
          setNetworkingIntent(matchPref.networking_intent ?? '');
        }

        if (globalPrefs) {
          setSelectedLanguages(parsePreferenceString(globalPrefs.languages));
          setSelectedInterests(parsePreferenceString(globalPrefs.interests));
          setSelectedIndustries(parsePreferenceString(globalPrefs.industry_background));
          setSelectedStartupStage(globalPrefs.startup_stage ?? '');
          setHasGlobalPrefs(
            !!(globalPrefs.languages || globalPrefs.interests || globalPrefs.industry_background || globalPrefs.startup_stage)
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, eventId]);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSave = async () => {
    if (!user?.id || !eventId) return;
    setSaving(true);
    try {
      await saveMatchPreference(eventId, user.id, {
        preferred_topics: preferredTopics || undefined,
        availability: availability || undefined,
        notes: notes || undefined,
        networking_intent: networkingIntent || undefined,
      });

      if (!hasGlobalPrefs) {
        const hasNew = selectedLanguages.length > 0 || selectedInterests.length > 0 ||
          selectedIndustries.length > 0 || selectedStartupStage;
        if (hasNew) {
          await upsertPreferences(user.id, {
            languages: serializePreferenceArray(selectedLanguages),
            interests: serializePreferenceArray(selectedInterests),
            industry_background: serializePreferenceArray(selectedIndustries),
            startup_stage: selectedStartupStage || null,
          });
        }
      }

      router.push('/user/event');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push('/user/event');
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/user/event')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-2xl font-bold text-foreground">
            {t('eventPreferences.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('eventPreferences.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Familiar faces from previous events */}
          {user?.id && <FamiliarFaces eventId={eventId} userId={user.id} />}

          {/* Event-specific preferences */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t('eventPreferences.eventSpecific')}
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                {t('eventPreferences.networkingIntent')}
              </label>
              <p className="text-xs text-muted-foreground">
                {t('eventPreferences.networkingIntentHint')}
              </p>
              {renderSingleChipGroup(NETWORKING_INTENT_OPTIONS, networkingIntent, 'networkingIntent', setNetworkingIntent)}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="topics">
                {t('eventPreferences.preferredTopics')}
              </label>
              <textarea
                id="topics"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
                value={preferredTopics}
                onChange={(e) => setPreferredTopics(e.target.value)}
                placeholder={t('eventPreferences.topicsPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="availability">
                {t('eventPreferences.availability')}
              </label>
              <input
                id="availability"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder={t('eventPreferences.availabilityPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="notes">
                {t('eventPreferences.notes')}
              </label>
              <textarea
                id="notes"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('eventPreferences.notesPlaceholder')}
              />
            </div>
          </div>

          {/* Global preferences (only if not filled) */}
          {!hasGlobalPrefs && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t('eventPreferences.globalPrefs')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('eventPreferences.globalPrefsHint')}
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.languages')}
                  </label>
                  {renderChipGroup(LANGUAGE_OPTIONS, selectedLanguages, 'languages', setSelectedLanguages)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.interests')}
                  </label>
                  {renderChipGroup(INTEREST_OPTIONS, selectedInterests, 'interests', setSelectedInterests)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.professionalBackground')}
                  </label>
                  {renderChipGroup(PROFESSIONAL_BACKGROUND_OPTIONS, selectedIndustries, 'professionalBackground', setSelectedIndustries)}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    {t('profile.startupStage')}
                  </label>
                  {renderSingleChipGroup(STARTUP_STAGE_OPTIONS, selectedStartupStage, 'startupStages', setSelectedStartupStage)}
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="px-4 py-3 border border-border text-muted-foreground rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              {t('eventPreferences.skip')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? t('profile.saving') : t('eventPreferences.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
