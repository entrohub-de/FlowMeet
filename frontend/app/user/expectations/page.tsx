'use client';

import { useTranslation } from '@/lib/i18n/context';
import { useExpectations } from '@/hooks/useExpectations';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Send, BookmarkCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { ExpectationTagSelector } from '@/components/expectations/ExpectationTagSelector';
import {
  serializeExpectationContent,
  getTagI18nKey,
} from '@/lib/expectation-templates';
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/api/expectation-templates';
import type { ExpectationTemplate } from '@/types/domain';

export default function ExpectationsPage() {
  const { t } = useTranslation();
  const {
    events,
    selectedEventId,
    setSelectedEventId,
    userId,
    loading,
    submitExpectation,
  } = useExpectations();

  // ── Template state ──
  const [templates, setTemplates] = useState<ExpectationTemplate[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorTags, setEditorTags] = useState<string[]>([]);
  const [editorText, setEditorText] = useState('');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getTemplates(userId);
      setTemplates(data);
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const resetEditor = useCallback(() => {
    setShowEditor(false);
    setEditingId(null);
    setEditorName('');
    setEditorTags([]);
    setEditorText('');
  }, []);

  const handleCreate = () => {
    resetEditor();
    setShowEditor(true);
  };

  const handleEdit = (tpl: ExpectationTemplate) => {
    setEditingId(tpl.template_id);
    setEditorName(tpl.name);
    setEditorTags(tpl.tags);
    setEditorText(tpl.text);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTemplate(id);
      await loadTemplates();
      toast.success(t('expectations.tpl.deleted'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleSaveTemplate = async () => {
    const name = editorName.trim();
    if (!name || !userId) return;
    if (editorTags.length === 0 && !editorText.trim()) return;

    try {
      if (editingId) {
        await updateTemplate(editingId, { name, tags: editorTags, text: editorText.trim() });
        toast.success(t('expectations.tpl.updated'));
      } else {
        await addTemplate(userId, name, editorTags, editorText.trim());
        toast.success(t('expectations.tpl.created'));
      }
      await loadTemplates();
      resetEditor();
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handleToggleTag = (tag: string) => {
    setEditorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApplyToEvent = async (tpl: ExpectationTemplate) => {
    if (!selectedEventId || !userId) {
      toast.error(t('expectations.tpl.selectEventFirst'));
      return;
    }

    setApplyingId(tpl.template_id);
    const content = serializeExpectationContent({ tags: tpl.tags, text: tpl.text });
    const ok = await submitExpectation(content);
    setApplyingId(null);

    if (ok) {
      toast.success(t('expectations.tpl.applied'));
    } else {
      toast.error(t('expectations.tpl.applyFailed'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  const editorValid = editorName.trim() && (editorTags.length > 0 || editorText.trim());

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('expectations.tpl.pageTitle')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('expectations.tpl.pageHint')}</p>
      </div>

      {/* ── My Templates ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t('expectations.tpl.myTemplates')}</h2>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('expectations.tpl.add')}
          </button>
        </div>

        {/* Template cards */}
        {templates.length === 0 && !showEditor && (
          <div className="bg-muted/30 border border-dashed border-border rounded-xl p-8 text-center">
            <BookmarkCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('expectations.tpl.empty')}</p>
            <button
              onClick={handleCreate}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              {t('expectations.tpl.createFirst')}
            </button>
          </div>
        )}

        {templates.map((tpl) => (
          <div
            key={tpl.template_id}
            className="bg-card border border-border rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground">{tpl.name}</h3>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleEdit(tpl)}
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title={t('common.edit')}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(tpl.template_id)}
                  className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {tpl.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tpl.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium"
                  >
                    {t(getTagI18nKey(tag))}
                  </span>
                ))}
              </div>
            )}

            {tpl.text && (
              <p className="text-sm text-muted-foreground">{tpl.text}</p>
            )}

            {/* Apply to event */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleApplyToEvent(tpl)}
                disabled={!selectedEventId || applyingId === tpl.template_id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
              >
                <Send className="w-3 h-3" />
                {applyingId === tpl.template_id ? t('common.loading') : t('expectations.tpl.applyToEvent')}
              </button>
              {!selectedEventId && (
                <span className="text-xs text-muted-foreground">{t('expectations.tpl.selectEventBelow')}</span>
              )}
            </div>
          </div>
        ))}

        {/* Bottom sheet modal for template editor */}
        {showEditor && (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-end justify-center"
            onClick={resetEditor}
          >
            <div
              className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl bg-card shadow-lg animate-in slide-in-from-bottom duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-border shrink-0">
                <h3 className="text-base font-semibold text-foreground">
                  {editingId ? t('expectations.tpl.editTitle') : t('expectations.tpl.createTitle')}
                </h3>
                <button
                  onClick={resetEditor}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {/* Template name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="tpl-name">
                    {t('expectations.tpl.name')}
                  </label>
                  <input
                    id="tpl-name"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    placeholder={t('expectations.tpl.namePlaceholder')}
                    autoFocus
                  />
                </div>

                {/* Tag selector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {t('expectations.selectTags')}
                  </label>
                  <ExpectationTagSelector
                    selectedTags={editorTags}
                    onToggleTag={handleToggleTag}
                    t={t}
                  />
                </div>

                {/* Custom text */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground" htmlFor="tpl-text">
                    {t('expectations.customText')}
                  </label>
                  <textarea
                    id="tpl-text"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={2}
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    placeholder={t('user.expectationPlaceholder')}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0">
                <button
                  onClick={handleSaveTemplate}
                  disabled={!editorValid}
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-feedback"
                >
                  {editingId ? t('common.save') : t('expectations.tpl.add')}
                </button>
                <button
                  onClick={resetEditor}
                  className="px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Apply to event ── */}
      <section className="space-y-3 pt-2 border-t border-border">
        <h2 className="text-base font-semibold text-foreground">{t('expectations.tpl.applySection')}</h2>
        <p className="text-xs text-muted-foreground">{t('expectations.tpl.applySectionHint')}</p>

        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t('user.noEvents')}</p>
        ) : (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">{t('user.selectEvent')}</option>
            {events.map((ev) => (
              <option key={ev.event_id} value={ev.event_id}>
                {ev.name}
              </option>
            ))}
          </select>
        )}
      </section>
    </div>
  );
}
