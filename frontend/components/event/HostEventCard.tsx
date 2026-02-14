'use client';

import { useState, useEffect } from 'react';
import type { Event } from '@/types/domain';
import { Calendar, MapPin, Settings, Trash2, AlertTriangle, X, Users, UserCheck, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import { deleteEvent } from '@/lib/api/events';
import { getCheckinStats } from '@/lib/api/signup';
import EditEventDialog from '@/components/event/EditEventDialog';

function formatDateRange(startStr: string, endStr: string, locale: string): string {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  const sameDay = start.toDateString() === end.toDateString();

  const datePart = start.toLocaleDateString(loc, dateOpts);
  const startTime = start.toLocaleTimeString(loc, timeOpts);
  const endTime = end.toLocaleTimeString(loc, timeOpts);

  if (sameDay) {
    return `${datePart}  ${startTime} – ${endTime}`;
  }
  const endDate = end.toLocaleDateString(loc, dateOpts);
  return `${datePart} ${startTime} – ${endDate} ${endTime}`;
}

interface HostEventCardProps {
  event: Event;
  onUpdate: () => void;
}

export default function HostEventCard({ event, onUpdate }: HostEventCardProps) {
  const { t, locale } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [stats, setStats] = useState({ checkedIn: 0, total: 0 });

  useEffect(() => {
    getCheckinStats(event.event_id).then(setStats);
  }, [event.event_id]);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setShowDeleteModal(false);

    try {
      await deleteEvent(event.event_id);
      onUpdate();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${t('ux.toast.deleteEventFailed')}: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const location = event.venue?.name || t('user.locationTbd');
  const isUpcoming = new Date(event.start_time) > new Date();
  const isPast = new Date(event.end_time) < new Date();
  const isOngoing = !isUpcoming && !isPast;

  const statusColor = isOngoing
    ? 'bg-green-100 text-green-800'
    : isUpcoming
      ? 'bg-blue-100 text-blue-800'
      : 'bg-gray-100 text-gray-800';

  const statusText = isOngoing
    ? t('host.events.status.ongoing')
    : isUpcoming
      ? t('host.events.status.upcoming')
      : t('host.events.status.past');

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {event.cover_image && (
        <img src={event.cover_image} alt={event.name} className="w-full h-32 object-cover" />
      )}

      <div className="p-4 space-y-3">
        {/* Title + Status */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground truncate">
            {event.name}
          </h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Date + Location inline */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            {formatDateRange(event.start_time, event.end_time, locale)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {location}
          </span>
        </div>

        {/* Stats + Actions inline */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              {t('host.events.signupCount', { count: stats.total })}
            </span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-green-600" />
              {t('host.events.checkedInCount', { count: stats.checkedIn })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-1 h-7 px-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-xs"
            >
              <Settings className="w-3 h-3" />
              {t('host.events.manage')}
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
              className="h-7 px-2 rounded-md border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Collapsible Description */}
        {event.description && (
          <div>
            <button
              onClick={() => setShowDescription(!showDescription)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDescription ? 'rotate-180' : ''}`} />
              {t('host.events.eventDescription')}
            </button>
            {showDescription && (
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            )}
          </div>
        )}
      </div>

      {showEditDialog && (
        <EditEventDialog
          event={event}
          onClose={() => setShowEditDialog(false)}
          onSuccess={() => {
            setShowEditDialog(false);
            onUpdate();
          }}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {t('host.events.deleteModalTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('host.events.deleteModalMessage')}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-9 rounded-lg border border-border hover:bg-muted transition-colors font-medium text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 h-9 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {deleting ? t('common.deleting') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
