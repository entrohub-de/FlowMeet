'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getVenues, createVenue, updateVenue, deleteVenue } from '@/lib/api/venues';
import type { Venue } from '@/types/domain';

export default function HostVenuesPage() {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/edit venue dialog
  const [showForm, setShowForm] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [formName, setFormName] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deletingVenueId, setDeletingVenueId] = useState<string | null>(null);


  const loadVenues = useCallback(async () => {
    setLoading(true);
    const data = await getVenues();
    setVenues(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadVenues(); }, [loadVenues]);

  const openCreateVenue = () => {
    setEditingVenue(null);
    setFormName('');
    setFormCapacity('');
    setFormAddress('');
    setFormDescription('');
    setShowForm(true);
  };

  const openEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setFormName(venue.name);
    setFormCapacity(String(venue.capacity));
    setFormAddress(venue.address ?? '');
    setFormDescription(venue.description ?? '');
    setShowForm(true);
  };

  const handleSaveVenue = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingVenue) {
        await updateVenue(editingVenue.venue_id, {
          name: formName.trim(),
          capacity: parseInt(formCapacity) || 0,
          address: formAddress.trim() || null,
          description: formDescription.trim() || null,
        });
      } else {
        await createVenue({
          name: formName.trim(),
          capacity: parseInt(formCapacity) || 0,
          address: formAddress.trim() || undefined,
          description: formDescription.trim() || undefined,
        });
      }
      setShowForm(false);
      loadVenues();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    await deleteVenue(venueId);
    setDeletingVenueId(null);
    loadVenues();
  };


  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={openCreateVenue}
            className="flex items-center justify-center gap-2 w-full px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            {t('venue.createVenue')}
          </button>
        </div>

        {/* Venue list */}
        {venues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">{t('venue.noVenues')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {venues.map((venue) => (
              <div key={venue.venue_id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Venue card */}
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{venue.name}</h3>
                      {venue.address && (
                        <p className="text-sm text-muted-foreground">{venue.address}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{t('venue.capacity')}: {venue.capacity}</span>
                        {venue.description && (
                          <span className="truncate max-w-[200px]">{venue.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditVenue(venue)}
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingVenueId(venue.venue_id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Venue form dialog */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                {editingVenue ? t('venue.editVenue') : t('venue.createVenue')}
              </h2>
              <div className="space-y-3">
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t('venue.name')}
                  autoFocus
                />
                <input
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder={t('venue.address')}
                />
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder={t('venue.capacity')}
                />
                <textarea
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('venue.description')}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-border text-foreground rounded-lg text-sm hover:bg-muted"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveVenue}
                  disabled={saving || !formName.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? t('profile.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete venue confirmation */}
        <AlertDialog open={!!deletingVenueId} onOpenChange={(open) => { if (!open) setDeletingVenueId(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('venue.deleteConfirm')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (deletingVenueId) handleDeleteVenue(deletingVenueId); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
