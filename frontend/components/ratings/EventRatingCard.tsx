'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { StarRating } from './StarRating';
import type { EventRating } from '@/types/domain';

interface EventRatingCardProps {
  eventRating: EventRating | null;
  onSubmit: (data: {
    overall_score: number;
    organization_score?: number;
    venue_score?: number;
    comment?: string;
  }) => Promise<void>;
  submitting: boolean;
}

export function EventRatingCard({ eventRating, onSubmit, submitting }: EventRatingCardProps) {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    overall_score: eventRating?.overall_score || 0,
    organization_score: eventRating?.organization_score || 0,
    venue_score: eventRating?.venue_score || 0,
    comment: eventRating?.comment || '',
  });

  // Update form when rating loads
  useEffect(() => {
    if (eventRating) {
      setForm({
        overall_score: eventRating.overall_score,
        organization_score: eventRating.organization_score || 0,
        venue_score: eventRating.venue_score || 0,
        comment: eventRating.comment || '',
      });
    }
  }, [eventRating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.overall_score === 0) return;
    await onSubmit(form);
  };

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">{t('rating.event.title')}</h2>

          {/* Overall Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t('rating.event.overallScore')} *
            </label>
            <StarRating
              value={form.overall_score}
              onChange={(value) => setForm({ ...form, overall_score: value })}
              size="lg"
              showLabel
            />
          </div>

          {/* Organization Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t('rating.event.organizationScore')}
            </label>
            <StarRating
              value={form.organization_score}
              onChange={(value) => setForm({ ...form, organization_score: value })}
              showLabel
            />
          </div>

          {/* Venue Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t('rating.event.venueScore')}
            </label>
            <StarRating
              value={form.venue_score}
              onChange={(value) => setForm({ ...form, venue_score: value })}
              showLabel
            />
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              {t('rating.comment')}
            </label>
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder={t('rating.commentPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={form.overall_score === 0 || submitting}
            className="w-full bg-primary text-primary-foreground px-button h-button rounded-button hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t('common.loading') : t('rating.event.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
