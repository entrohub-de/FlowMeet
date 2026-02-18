'use client';

import { useState, useEffect } from 'react';
import { X, Save, SkipForward, Sparkles, BookmarkCheck, Globe, Heart, Briefcase, Rocket, Target } from 'lucide-react';
import { toast } from 'sonner';
import { getMatchPreference, saveMatchPreference } from '@/lib/api/matching';
import { getPreferences, upsertPreferences } from '@/lib/api/profile';
import { getUserExpectation, upsertExpectation } from '@/lib/api/expectations';
import {
  parseExpectationContent,
  serializeExpectationContent,
  saveLastUsedTags,
  getLastUsedTags,
} from '@/lib/expectation-templates';
import { getTemplates } from '@/lib/api/expectation-templates';
import type { ExpectationTemplate } from '@/types/domain';
import { ExpectationTagSelector } from '@/components/expectations/ExpectationTagSelector';
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
  const [networkingIntent, setNetworkingIntent] = useState('');

  // Expectations (tag-based)
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expectationText, setExpectationText] = useState('');
  const [userTemplates, setUserTemplates] = useState<ExpectationTemplate[]>([]);

  // Global preferences
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedStartupStage, setSelectedStartupStage] = useState('');
  const [hasGlobalPrefs, setHasGlobalPrefs] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const tpls = await getTemplates(userId);
        setUserTemplates(tpls);
      } catch { /* ignore */ }
      try {
        const [matchPref, globalPrefs, existingExpectation] = await Promise.all([
          getMatchPreference(eventId, userId),
          getPreferences(userId),
          getUserExpectation(eventId, userId),
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

        if (existingExpectation) {
          const data = parseExpectationContent(existingExpectation.content);
          setSelectedTags(data.tags);
          setExpectationText(data.text);
        } else {
          setSelectedTags(getLastUsedTags());
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId, userId]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApplyTemplate = (tpl: ExpectationTemplate) => {
    setSelectedTags(tpl.tags);
    setExpectationText(tpl.text);
    toast.success(t('expectations.tpl.templateLoaded'));
  };

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMatchPreference(eventId, userId, {
        preferred_topics: preferredTopics || undefined,
        availability: availability || undefined,
        notes: notes || undefined,
        networking_intent: networkingIntent || undefined,
      });

      if (selectedTags.length > 0 || expectationText.trim()) {
        const content = serializeExpectationContent({
          tags: selectedTags,
          text: expectationText.trim(),
        });
        await upsertExpectation(eventId, userId, content);
        saveLastUsedTags(selectedTags);
      }

      if (!hasGlobalPrefs) {
        const hasNew = selectedLanguages.length > 0 || selectedInterests.length > 0 ||
          selectedIndustries.length > 0 || selectedStartupStage;
        if (hasNew) {
          await upsertPreferences(userId, {
            languages: serializePreferenceArray(selectedLanguages),
            interests: serializePreferenceArray(selectedInterests),
            industry_background: serializePreferenceArray(selectedIndustries),
            startup_stage: selectedStartupStage || null,
          });
        }
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
            <p className="text-sm text-muted-foreground">
              {t('eventPreferences.modalHint')}
            </p>

            {/* Expectations section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                {t('expectations.sectionTitle')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('expectations.sectionHint')}
              </p>

              {userTemplates.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <BookmarkCheck className="w-3 h-3" />
                    {t('expectations.tpl.quickApply')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {userTemplates.map((tpl) => (
                      <button
                        key={tpl.template_id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <ExpectationTagSelector
                selectedTags={selectedTags}
                onToggleTag={handleToggleTag}
                t={t}
              />

              <textarea
                className={`${inputClass} resize-none`}
                rows={2}
                value={expectationText}
                onChange={(e) => setExpectationText(e.target.value)}
                placeholder={t('user.expectationPlaceholder')}
              />
            </div>

            {/* Networking Intent */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  {t('eventPreferences.networkingIntent')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('eventPreferences.networkingIntentHint')}
                </p>
                {renderSingleChipGroup(NETWORKING_INTENT_OPTIONS, networkingIntent, 'networkingIntent', setNetworkingIntent)}
              </div>
            </div>

            {/* Event-specific preferences */}
            <div className="space-y-3 pt-2 border-t border-border">
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

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t('profile.languages')}
                    </label>
                    {renderChipGroup(LANGUAGE_OPTIONS, selectedLanguages, 'languages', setSelectedLanguages)}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      {t('profile.interests')}
                    </label>
                    {renderChipGroup(INTEREST_OPTIONS, selectedInterests, 'interests', setSelectedInterests)}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {t('profile.professionalBackground')}
                    </label>
                    {renderChipGroup(PROFESSIONAL_BACKGROUND_OPTIONS, selectedIndustries, 'professionalBackground', setSelectedIndustries)}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Rocket className="w-3.5 h-3.5" />
                      {t('profile.startupStage')}
                    </label>
                    {renderSingleChipGroup(STARTUP_STAGE_OPTIONS, selectedStartupStage, 'startupStages', setSelectedStartupStage)}
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
