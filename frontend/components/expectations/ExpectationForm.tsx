'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Expectation } from '@/types/domain';

interface ExpectationFormProps {
  expectation: Expectation | null;
  onSubmit: (content: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  submitting: boolean;
}

export function ExpectationForm({
  expectation,
  onSubmit,
  onDelete,
  submitting,
}: ExpectationFormProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(expectation?.content || '');
  const [isEditing, setIsEditing] = useState(!expectation);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update content when expectation changes (e.g., when switching events)
  useEffect(() => {
    setContent(expectation?.content || '');
    setIsEditing(!expectation);
    setShowDeleteConfirm(false);
  }, [expectation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const success = await onSubmit(content);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDelete = async () => {
    const success = await onDelete();
    if (success) {
      setShowDeleteConfirm(false);
      setContent('');
      setIsEditing(true);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t('user.myExpectation')}</h2>
        {!isEditing && expectation && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-button transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-button transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-3">{t('user.confirmDeleteExpectation')}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="px-button h-button bg-red-600 text-white rounded-button hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? t('common.deleting') : t('common.confirmDelete')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-button h-button border rounded-button hover:bg-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('user.expectationPlaceholder')}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={4}
            required
          />
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-button h-button bg-primary text-primary-foreground rounded-button hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? t('profile.saving')
                : expectation
                ? t('user.updateExpectation')
                : t('user.submitExpectation')}
            </button>
            {expectation && (
              <button
                type="button"
                onClick={() => {
                  setContent(expectation.content);
                  setIsEditing(false);
                  setShowDeleteConfirm(false);
                }}
                className="px-button h-button border rounded-button hover:bg-secondary transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="border-l-4 border-primary pl-4 py-2">
          <p className="text-gray-800 whitespace-pre-wrap">{content}</p>
        </div>
      )}
    </div>
  );
}
