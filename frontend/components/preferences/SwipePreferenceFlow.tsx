'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import PreferenceCard from './PreferenceCard';
import {
  PROFESSIONAL_BACKGROUND_OPTIONS,
  NETWORKING_INTENT_OPTIONS,
  STARTUP_STAGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  TOPIC_TAG_OPTIONS,
} from '@/lib/preference-options';

export interface PreferenceAnswers {
  industry_background: string[];
  networking_intent: string[];
  startup_stage: string[];
  interests: string[];
  languages: string[];
  preferred_topics_tags: string[];
}

interface SwipePreferenceFlowProps {
  initialAnswers?: Partial<PreferenceAnswers>;
  /** Skip first 4 cards if user already has global preferences */
  skipGlobalPrefs?: boolean;
  onComplete: (answers: PreferenceAnswers) => void;
  onSkipAll: () => void;
}

interface CardConfig {
  key: keyof PreferenceAnswers;
  questionKey: string;
  options: readonly string[];
  multiSelect: boolean;
  i18nPrefix: string;
}

const ALL_CARDS: CardConfig[] = [
  {
    key: 'industry_background',
    questionKey: 'swipePreference.q.industry',
    options: PROFESSIONAL_BACKGROUND_OPTIONS,
    multiSelect: true,
    i18nPrefix: 'professionalBackground',
  },
  {
    key: 'networking_intent',
    questionKey: 'swipePreference.q.intent',
    options: NETWORKING_INTENT_OPTIONS,
    multiSelect: false,
    i18nPrefix: 'networkingIntent',
  },
  {
    key: 'startup_stage',
    questionKey: 'swipePreference.q.stage',
    options: STARTUP_STAGE_OPTIONS,
    multiSelect: false,
    i18nPrefix: 'startupStages',
  },
  {
    key: 'interests',
    questionKey: 'swipePreference.q.interests',
    options: INTEREST_OPTIONS,
    multiSelect: true,
    i18nPrefix: 'interests',
  },
  {
    key: 'languages',
    questionKey: 'swipePreference.q.languages',
    options: LANGUAGE_OPTIONS,
    multiSelect: true,
    i18nPrefix: 'languages',
  },
  {
    key: 'preferred_topics_tags',
    questionKey: 'swipePreference.q.topics',
    options: TOPIC_TAG_OPTIONS,
    multiSelect: true,
    i18nPrefix: 'topicTags',
  },
];

export default function SwipePreferenceFlow({
  initialAnswers,
  skipGlobalPrefs,
  onComplete,
  onSkipAll,
}: SwipePreferenceFlowProps) {
  const { t } = useTranslation();

  // If skipGlobalPrefs, start from card index 4 (languages) — actually skip first 4 (industry, intent, stage, interests)
  const cards = skipGlobalPrefs ? ALL_CARDS.slice(4) : ALL_CARDS;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'enter' | 'exit' | null>(null);
  const [answers, setAnswers] = useState<PreferenceAnswers>({
    industry_background: initialAnswers?.industry_background ?? [],
    networking_intent: initialAnswers?.networking_intent ?? [],
    startup_stage: initialAnswers?.startup_stage ?? [],
    interests: initialAnswers?.interests ?? [],
    languages: initialAnswers?.languages ?? [],
    preferred_topics_tags: initialAnswers?.preferred_topics_tags ?? [],
  });

  const currentCard = cards[currentIndex];
  const totalCards = cards.length;

  const handleToggle = useCallback(
    (value: string) => {
      if (!currentCard) return;
      const key = currentCard.key;

      setAnswers((prev) => {
        const current = prev[key];
        if (currentCard.multiSelect) {
          const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
          return { ...prev, [key]: next };
        }
        // Single select: toggle or replace
        return { ...prev, [key]: current[0] === value ? [] : [value] };
      });
    },
    [currentCard]
  );

  const goNext = useCallback(() => {
    if (currentIndex >= totalCards - 1) {
      onComplete(answers);
      return;
    }
    setDirection('exit');
    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setDirection('enter');
      setTimeout(() => setDirection(null), 300);
    }, 200);
  }, [currentIndex, totalCards, answers, onComplete]);

  const goBack = useCallback(() => {
    if (currentIndex <= 0) return;
    setDirection('exit');
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setDirection('enter');
      setTimeout(() => setDirection(null), 300);
    }, 200);
  }, [currentIndex]);

  if (!currentCard) return null;

  const hasSelection = answers[currentCard.key].length > 0;
  const isLast = currentIndex === totalCards - 1;

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col p-4">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              {currentIndex + 1} / {totalCards}
            </span>
            {currentIndex > 0 && (
              <button onClick={goBack} className="hover:text-foreground transition-colors">
                {t('common.back')}
              </button>
            )}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
            />
          </div>
        </div>

        {/* Card area */}
        <div
          className={
            direction === 'exit'
              ? 'card-exit'
              : direction === 'enter'
                ? 'card-enter'
                : ''
          }
        >
          <PreferenceCard
            question={t(currentCard.questionKey)}
            options={currentCard.options}
            selected={answers[currentCard.key]}
            onToggle={handleToggle}
            multiSelect={currentCard.multiSelect}
            i18nPrefix={currentCard.i18nPrefix}
            onSkip={goNext}
          />
        </div>

        {/* Bottom buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onSkipAll}
            className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('swipePreference.skipAll')}
          </button>
          <button
            onClick={goNext}
            disabled={!hasSelection}
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed touch-target touch-feedback"
          >
            {isLast ? t('swipePreference.done') : t('swipePreference.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
