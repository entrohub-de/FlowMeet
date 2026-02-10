import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { StarRating } from './StarRating';
import type { MatchQualityRating } from '@/types/domain';

interface MatchQualityRatingCardProps {
  matchQualityRating: MatchQualityRating | null;
  onSubmit: (score: number, comment?: string) => Promise<void>;
  submitting: boolean;
}

export function MatchQualityRatingCard({
  matchQualityRating,
  onSubmit,
  submitting,
}: MatchQualityRatingCardProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    score: matchQualityRating?.score || 0,
    comment: matchQualityRating?.comment || '',
  });

  // Update form when rating loads
  useEffect(() => {
    if (matchQualityRating) {
      setForm({
        score: matchQualityRating.score,
        comment: matchQualityRating.comment || '',
      });
    }
  }, [matchQualityRating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.score === 0) return;
    await onSubmit(form.score, form.comment);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-2">{t('rating.matchQuality.title')}</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {t('rating.matchQuality.description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Score *</label>
          <StarRating
            value={form.score}
            onChange={(value) => setForm({ ...form, score: value })}
            size="lg"
            showLabel
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('rating.comment')}</label>
          <textarea
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            placeholder={t('rating.commentPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={form.score === 0 || submitting}
          className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? t('common.loading') : t('rating.matchQuality.submit')}
        </button>
      </form>
    </div>
  );
}
