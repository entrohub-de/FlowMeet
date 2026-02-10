'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useState } from 'react';

interface ExpectationFormProps {
  initialValue: string;
  onSubmit: (content: string) => Promise<boolean>;
  submitting: boolean;
}

export function ExpectationForm({
  initialValue,
  onSubmit,
  submitting,
}: ExpectationFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const success = await onSubmit(content);
    if (success) {
      alert(t('user.expectationSubmitted'));
    } else {
      alert(t('common.error'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h2 className="text-xl font-semibold mb-4">{t('user.myExpectation')}</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('user.expectationPlaceholder')}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          required
        />
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="mt-4 px-button h-button bg-blue-600 text-white rounded-button hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? t('profile.saving')
            : initialValue
            ? t('user.updateExpectation')
            : t('user.submitExpectation')}
        </button>
      </form>
    </div>
  );
}
