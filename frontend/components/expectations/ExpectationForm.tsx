'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useState, useEffect } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import type { Expectation } from '@/types/domain';
import {
  parseExpectationContent,
  serializeExpectationContent,
  getTagI18nKey,
  saveLastUsedTags,
  getLastUsedTags,
} from '@/lib/expectation-templates';
import { ExpectationTagSelector } from './ExpectationTagSelector';

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customText, setCustomText] = useState('');
  const [isEditing, setIsEditing] = useState(!expectation);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Parse existing expectation or load last-used tags for new expectations
  useEffect(() => {
    if (expectation) {
      const data = parseExpectationContent(expectation.content);
      setSelectedTags(data.tags);
      setCustomText(data.text);
      setIsEditing(false);
    } else {
      // Auto-populate with last-used tags for reuse
      setSelectedTags(getLastUsedTags());
      setCustomText('');
      setIsEditing(true);
    }
    setShowDeleteConfirm(false);
  }, [expectation]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTags.length === 0 && !customText.trim()) return;

    const content = serializeExpectationContent({
      tags: selectedTags,
      text: customText.trim(),
    });

    const success = await onSubmit(content);
    if (success) {
      saveLastUsedTags(selectedTags);
      setIsEditing(false);
    }
  };

  const handleEdit = () => setIsEditing(true);

  const handleDelete = async () => {
    const success = await onDelete();
    if (success) {
      setShowDeleteConfirm(false);
      setSelectedTags([]);
      setCustomText('');
      setIsEditing(true);
    }
  };

  const hasContent = selectedTags.length > 0 || customText.trim();

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">{t('user.myExpectation')}</h2>
        {!isEditing && expectation && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {t('common.edit')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('expectations.selectTags')}
            </label>
            <ExpectationTagSelector
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              t={t}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="expectation-text">
              {t('expectations.customText')}
            </label>
            <textarea
              id="expectation-text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={t('user.expectationPlaceholder')}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !hasContent}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
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
                  const data = parseExpectationContent(expectation.content);
                  setSelectedTags(data.tags);
                  setCustomText(data.text);
                  setIsEditing(false);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary font-medium"
                >
                  {t(getTagI18nKey(tag))}
                </span>
              ))}
            </div>
          )}
          {customText && (
            <div className="border-l-4 border-primary pl-4 py-2">
              <p className="text-foreground whitespace-pre-wrap text-sm">{customText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
