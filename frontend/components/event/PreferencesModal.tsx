'use client';

import { useState, useEffect } from 'react';
import { X, Save, SkipForward, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getMatchPreference, saveMatchPreference } from '@/lib/api/matching';
import { getPreferences, upsertPreferences } from '@/lib/api/profile';

interface PreferencesModalProps {
  eventId: string;
  userId: string;
  t: (key: string) => string;
  onClose: () => void;
}

export default function PreferencesModal({ eventId, userId, t, onClose }: PreferencesModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Event-specific preferences
  const [preferredTopics, setPreferredTopics] = useState('');
  const [availability, setAvailability] = useState('');
  const [notes, setNotes] = useState('');

  // Global preferences
  const [languages, setLanguages] = useState('');
  const [interests, setInterests] = useState('');
  const [purpose, setPurpose] = useState('');
  const [industryBackground, setIndustryBackground] = useState('');
  const [hasGlobalPrefs, setHasGlobalPrefs] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [matchPref, globalPrefs] = await Promise.all([
          getMatchPreference(eventId, userId),
          getPreferences(userId),
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
          setHasGlobalPrefs(
            !!(globalPrefs.languages || globalPrefs.interests || globalPrefs.purpose || globalPrefs.industry_background)
          );
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMatchPreference(eventId, userId, {
        preferred_topics: preferredTopics || undefined,
        availability: availability || undefined,
        notes: notes || undefined,
      });

      if (!hasGlobalPrefs && (languages || interests || purpose || industryBackground)) {
        await upsertPreferences(userId, {
          languages: languages || null,
          interests: interests || null,
          purpose: purpose || null,
          industry_background: industryBackground || null,
        });
      }

      toast.success(t('eventPreferences.saved'));
      onClose();
    } catch {
      toast.error(t('eventPreferences.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {t('eventPreferences.modalTitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Hint */}
            <p className="text-sm text-muted-foreground">
              {t('eventPreferences.modalHint')}
            </p>

            {/* Event-specific preferences */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t('eventPreferences.eventSpecific')}
              </h3>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="modal-topics">
                  {t('eventPreferences.preferredTopics')}
                </label>
                <textarea
                  id="modal-topics"
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={preferredTopics}
                  onChange={(e) => setPreferredTopics(e.target.value)}
                  placeholder={t('eventPreferences.topicsPlaceholder')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="modal-availability">
                  {t('eventPreferences.availability')}
                </label>
                <input
                  id="modal-availability"
                  className={inputClass}
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  placeholder={t('eventPreferences.availabilityPlaceholder')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="modal-notes">
                  {t('eventPreferences.notes')}
                </label>
                <textarea
                  id="modal-notes"
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('eventPreferences.notesPlaceholder')}
                />
              </div>
            </div>

            {/* Global preferences */}
            {!hasGlobalPrefs && (
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  {t('eventPreferences.globalPrefs')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('eventPreferences.globalPrefsHint')}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="modal-languages">
                      {t('profile.languages')}
                    </label>
                    <input
                      id="modal-languages"
                      className={inputClass}
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder={t('profile.languagesPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="modal-interests">
                      {t('profile.interests')}
                    </label>
                    <input
                      id="modal-interests"
                      className={inputClass}
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder={t('profile.interestsPlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="modal-purpose">
                      {t('profile.purpose')}
                    </label>
                    <input
                      id="modal-purpose"
                      className={inputClass}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder={t('profile.purposePlaceholder')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground" htmlFor="modal-industry">
                      {t('profile.industryBackground')}
                    </label>
                    <input
                      id="modal-industry"
                      className={inputClass}
                      value={industryBackground}
                      onChange={(e) => setIndustryBackground(e.target.value)}
                      placeholder={t('profile.industryBackgroundPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-border text-muted-foreground rounded-xl font-medium hover:bg-muted transition-colors flex items-center gap-2 touch-feedback"
              >
                <SkipForward className="w-4 h-4" />
                {t('eventPreferences.skip')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-feedback"
              >
                <Save className="w-4 h-4" />
                {saving ? t('profile.saving') : t('eventPreferences.save')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
