'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import { getAds, deleteAd, updateAd } from '@/lib/api/ads';
import type { Advertisement } from '@/types/domain';
import AdDialog from '@/components/ads/AdDialog';
import { Plus, Pencil, Trash2, Globe, CalendarDays, ExternalLink } from 'lucide-react';

export default function AdminAdsPage() {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  const loadAds = useCallback(async () => {
    try {
      const data = await getAds();
      setAds(data);
    } catch {
      toast.error(t('admin.ads.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const handleDelete = async (ad: Advertisement) => {
    if (!confirm(t('admin.ads.confirmDelete'))) return;
    try {
      await deleteAd(ad.ad_id);
      toast.success(t('admin.ads.deleted'));
      loadAds();
    } catch {
      toast.error(t('admin.ads.deleteFailed'));
    }
  };

  const handleToggleActive = async (ad: Advertisement) => {
    try {
      await updateAd(ad.ad_id, { is_active: !ad.is_active });
      loadAds();
    } catch {
      toast.error(t('admin.ads.updateFailed'));
    }
  };

  const openCreate = () => {
    setEditingAd(null);
    setDialogOpen(true);
  };

  const openEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setEditingAd(null);
    loadAds();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl text-center py-16">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.ads.title')}</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('admin.ads.create')}
        </button>
      </div>

      {/* Ads List */}
      {ads.length === 0 ? (
        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-12 text-center">
          <p className="text-muted-foreground">{t('admin.ads.noAds')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.ad_id}
              className={`rounded-xl border bg-card overflow-hidden transition-opacity ${
                !ad.is_active ? 'opacity-60' : ''
              }`}
            >
              {/* Image */}
              {ad.image_url ? (
                <img src={ad.image_url} alt={ad.title} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-muted/50 flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">{t('admin.ads.noImage')}</span>
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground line-clamp-1">{ad.title}</h3>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                      ad.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {ad.is_active ? t('admin.ads.active') : t('admin.ads.inactive')}
                  </span>
                </div>

                {ad.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {ad.event_id ? <CalendarDays className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    {ad.event_id ? t('admin.ads.specificEvent') : t('admin.ads.global')}
                  </span>
                  {ad.link_url && (
                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {t('admin.ads.linkUrl')}
                    </a>
                  )}
                  {ad.start_date && (
                    <span>
                      {new Date(ad.start_date).toLocaleDateString()} - {ad.end_date ? new Date(ad.end_date).toLocaleDateString() : '∞'}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <button
                    onClick={() => openEdit(ad)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t('admin.ads.edit')}
                  </button>
                  <button
                    onClick={() => handleToggleActive(ad)}
                    className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
                  >
                    {ad.is_active ? t('admin.ads.deactivate') : t('admin.ads.activate')}
                  </button>
                  <button
                    onClick={() => handleDelete(ad)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive rounded-lg hover:bg-destructive/10 transition-colors ml-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <AdDialog
          ad={editingAd}
          onClose={() => { setDialogOpen(false); setEditingAd(null); }}
          onSuccess={handleDialogSuccess}
        />
      )}
    </div>
  );
}
