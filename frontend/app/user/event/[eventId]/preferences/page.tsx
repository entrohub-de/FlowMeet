'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/useAuth';
import { useTranslation } from '@/lib/i18n/context';
import { getMatchPreference, saveMatchPreference } from '@/lib/api/matching';
import { getPreferences, upsertPreferences } from '@/lib/api/profile';
import { supabase } from '@/lib/supabase/client';
import SwipePreferenceFlow, { type PreferenceAnswers } from '@/components/preferences/SwipePreferenceFlow';
import {
  parsePreferenceString,
  serializePreferenceArray,
} from '@/lib/preference-options';

export default function EventPreferencesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [hasGlobalPrefs, setHasGlobalPrefs] = useState(false);
  const [initialAnswers, setInitialAnswers] = useState<Partial<PreferenceAnswers>>({});

  useEffect(() => {
    if (!user?.id || !eventId) return;
    const load = async () => {
      try {
        const [matchPref, globalPrefs] = await Promise.all([
          getMatchPreference(eventId, user.id),
          getPreferences(user.id),
        ]);

        const answers: Partial<PreferenceAnswers> = {};

        if (globalPrefs) {
          answers.languages = parsePreferenceString(globalPrefs.languages);
          answers.interests = parsePreferenceString(globalPrefs.interests);
          answers.industry_background = parsePreferenceString(globalPrefs.industry_background);
          answers.startup_stage = globalPrefs.startup_stage ? [globalPrefs.startup_stage] : [];
          setHasGlobalPrefs(
            !!(globalPrefs.languages || globalPrefs.interests || globalPrefs.industry_background || globalPrefs.startup_stage)
          );
        }

        if (matchPref) {
          answers.networking_intent = matchPref.networking_intent ? [matchPref.networking_intent] : [];
          answers.preferred_topics_tags = matchPref.preferred_topics_tags ?? [];
        }

        setInitialAnswers(answers);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, eventId]);

  const handleComplete = useCallback(async (answers: PreferenceAnswers) => {
    if (!user?.id || !eventId) return;

    // Save event-specific match preferences
    const matchPrefData: Record<string, unknown> = {
      networking_intent: answers.networking_intent[0] || undefined,
    };

    await saveMatchPreference(eventId, user.id, matchPrefData as { networking_intent?: string });

    // Save preferred_topics_tags separately via direct upsert
    await supabase
      .from('match_preferences')
      .upsert(
        {
          event_id: eventId,
          user_id: user.id,
          preferred_topics_tags: answers.preferred_topics_tags,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' }
      );

    // Save global preferences if not already filled
    if (!hasGlobalPrefs) {
      const hasNew = answers.languages.length > 0 || answers.interests.length > 0 ||
        answers.industry_background.length > 0 || answers.startup_stage.length > 0;
      if (hasNew) {
        await upsertPreferences(user.id, {
          languages: serializePreferenceArray(answers.languages),
          interests: serializePreferenceArray(answers.interests),
          industry_background: serializePreferenceArray(answers.industry_background),
          startup_stage: answers.startup_stage[0] || null,
        });
      }
    }

    router.push('/user/event');
  }, [user?.id, eventId, hasGlobalPrefs, router]);

  const handleSkipAll = useCallback(() => {
    router.push('/user/event');
  }, [router]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <SwipePreferenceFlow
      initialAnswers={initialAnswers}
      skipGlobalPrefs={hasGlobalPrefs}
      onComplete={handleComplete}
      onSkipAll={handleSkipAll}
    />
  );
}
