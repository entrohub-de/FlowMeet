'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import { createEvent } from '@/lib/api/events';
import { supabase } from '@/lib/supabase/client';
import type { Venue } from '@/types/domain';
import { X } from 'lucide-react';

interface CreateEventDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateEventDialog({
  onClose,
  onSuccess,
}: CreateEventDialogProps) {
  const { t } = useTranslation();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    venue_id: '',
  });

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const { data, error } = await supabase.from('evt_venues').select('*');
      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error('Failed to load venues:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast.error(t('ux.toast.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      await createEvent({
        name: formData.name,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue_id: formData.venue_id || null,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create event:', error);
      toast.error(t('ux.toast.createEventFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="text-xl font-semibold text-foreground">
            {t('host.events.createEvent')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('host.events.eventName')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t('host.events.eventNamePlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('host.events.eventDescription')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t('host.events.descriptionPlaceholder')}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('host.events.startTime')} <span className="text-destructive">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) =>
                setFormData({ ...formData, start_time: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('host.events.endTime')} <span className="text-destructive">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) =>
                setFormData({ ...formData, end_time: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('host.events.venue')}
            </label>
            <select
              value={formData.venue_id}
              onChange={(e) =>
                setFormData({ ...formData, venue_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('host.events.selectVenue')}</option>
              {venues.map((venue) => (
                <option key={venue.venue_id} value={venue.venue_id}>
                  {venue.name}
                </option>
              ))}
            </select>
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
              {loading ? t('host.events.creating') : t('host.events.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
