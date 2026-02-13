'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, SkipForward } from 'lucide-react';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getMatchPreference, saveMatchPreference } from '@/lib/api/matching';
import { getPreferences, upsertPreferences } from '@/lib/api/profile';

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

  // Global preferences (show only if not filled)
  const [languages, setLanguages] = useState('');
  const [interests, setInterests] = useState('');
  const [purpose, setPurpose] = useState('');
  const [industryBackground, setIndustryBackground] = useState('');
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
        }

        if (globalPrefs) {
          setLanguages(globalPrefs.languages ?? '');
          setInterests(globalPrefs.interests ?? '');
          setPurpose(globalPrefs.purpose ?? '');
          setIndustryBackground(globalPrefs.industry_background ?? '');
          // If any global pref is already filled, mark as having prefs
          setHasGlobalPrefs(
            !!(globalPrefs.languages || globalPrefs.interests || globalPrefs.purpose || globalPrefs.industry_background)
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, eventId]);

  const handleSave = async () => {
    if (!user?.id || !eventId) return;
    setSaving(true);
    try {
      await saveMatchPreference(eventId, user.id, {
        preferred_topics: preferredTopics || undefined,
        availability: availability || undefined,
        notes: notes || undefined,
      });

      // Save global prefs if user filled them
      if (!hasGlobalPrefs && (languages || interests || purpose || industryBackground)) {
        await upsertPreferences(user.id, {
          languages: languages || null,
          interests: interests || null,
          purpose: purpose || null,
          industry_background: industryBackground || null,
        });
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
          {/* Event-specific preferences */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t('eventPreferences.eventSpecific')}
            </h2>

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
