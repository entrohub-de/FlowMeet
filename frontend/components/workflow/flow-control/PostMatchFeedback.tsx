'use client';

import { useCallback, useState } from 'react';
import { Star, Send, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { upsertMatchRating } from '@/lib/api/ratings';

interface PostMatchFeedbackProps {
  matchId: string;
  userId: string;
  onDismiss: () => void;
}

export default function PostMatchFeedback({
  matchId,
  userId,
  onDismiss,
}: PostMatchFeedbackProps) {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (score === 0 || submitting) return;
    setSubmitting(true);
    try {
      await upsertMatchRating(matchId, userId, score, comment || undefined);
      setSubmitted(true);
      setTimeout(onDismiss, 1500);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setSubmitting(false);
    }
  }, [matchId, userId, score, comment, submitting, onDismiss]);

  if (submitted) {
    return (
      <div className="bg-background rounded-lg p-5 text-center space-y-2">
        <div className="text-2xl">&#10003;</div>
        <p className="text-sm text-muted-foreground">{t('rating.submitted')}</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          {t('feedback.rateConversation')}
        </h3>
        <button
          onClick={onDismiss}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Star rating */}
      <div className="flex items-center justify-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setScore(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-colors ${
                star <= (hoveredStar || score)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
      {score > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t(`rating.stars.${score}`)}
        </p>
      )}

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t('feedback.placeholder')}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        rows={2}
      />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onDismiss}
          className="flex-1 px-3 py-2 text-sm border border-border text-muted-foreground rounded-lg hover:bg-muted transition-colors"
        >
          {t('feedback.skip')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={score === 0 || submitting}
          className="flex-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          {t('feedback.submit')}
        </button>
      </div>
    </div>
  );
}
