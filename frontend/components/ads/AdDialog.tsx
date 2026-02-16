'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import { createAd, updateAd } from '@/lib/api/ads';
import { uploadAdImage } from '@/lib/api/storage';
import { getEvents } from '@/lib/api/events';
import type { Advertisement, Event } from '@/types/domain';
import { X, ImagePlus, Trash2 } from 'lucide-react';

interface AdDialogProps {
  ad?: Advertisement | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdDialog({ ad, onClose, onSuccess }: AdDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!ad;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(ad?.image_url || null);

  const [formData, setFormData] = useState({
    title: ad?.title || '',
    description: ad?.description || '',
    link_url: ad?.link_url || '',
    event_id: ad?.event_id || '',
    sort_order: ad?.sort_order ?? 0,
    is_active: ad?.is_active ?? true,
    start_date: ad?.start_date ? ad.start_date.slice(0, 16) : '',
    end_date: ad?.end_date ? ad.end_date.slice(0, 16) : '',
  });

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error(t('ux.toast.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        link_url: formData.link_url || null,
        event_id: formData.event_id || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      let savedAd: Advertisement;
      if (isEdit) {
        savedAd = await updateAd(ad.ad_id, payload);
      } else {
        savedAd = await createAd(payload);
      }

      if (imageFile) {
        try {
          const url = await uploadAdImage(imageFile, savedAd.ad_id);
          await updateAd(savedAd.ad_id, { image_url: url });
        } catch {
          toast.error(t('admin.ads.imageUploadFailed'));
        }
      }

      toast.success(isEdit ? t('admin.ads.updated') : t('admin.ads.created'));
      onSuccess();
    } catch {
      toast.error(isEdit ? t('admin.ads.updateFailed') : t('admin.ads.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, value: string | number | boolean) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-xl font-semibold text-foreground">
            {isEdit ? t('admin.ads.edit') : t('admin.ads.create')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.adTitle')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={t('admin.ads.titlePlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t('admin.ads.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.imageUrl')}
            </label>
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img src={imagePreview} alt="" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <ImagePlus className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">{t('admin.ads.uploadImage')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.linkUrl')}
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => set('link_url', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Event Scope */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.eventScope')}
            </label>
            <select
              value={formData.event_id}
              onChange={(e) => set('event_id', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('admin.ads.global')}</option>
              {events.map((ev) => (
                <option key={ev.event_id} value={ev.event_id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('admin.ads.sortOrder')}
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => set('sort_order', Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('admin.ads.startDate')}
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => set('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('admin.ads.endDate')}
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => set('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-foreground">
              {t('admin.ads.isActive')}
            </label>
            <button
              type="button"
              onClick={() => set('is_active', !formData.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.is_active ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-muted-foreground">
              {formData.is_active ? t('admin.ads.active') : t('admin.ads.inactive')}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-button h-button rounded-button border border-border hover:bg-muted transition-colors font-medium"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
