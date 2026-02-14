'use client';

import { useState, useEffect } from 'react';
import type { Event, Signup } from '@/types/domain';
import { Calendar, MapPin, Clock, Settings, Trash2, AlertTriangle, X, Users, ChevronDown, ChevronUp, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import Link from 'next/link';
import { deleteEvent } from '@/lib/api/events';
import { getCheckinStats, getEventSignups } from '@/lib/api/signup';
import EditEventDialog from '@/components/event/EditEventDialog';

function formatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const [stats, setStats] = useState({ checkedIn: 0, total: 0 });
  const [expanded, setExpanded] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loadingSignups, setLoadingSignups] = useState(false);

  useEffect(() => {
    getCheckinStats(event.event_id).then(setStats);
  }, [event.event_id]);

  const handleToggleExpand = async () => {
    if (!expanded && signups.length === 0) {
      setLoadingSignups(true);
      try {
        const data = await getEventSignups(event.event_id);
        setSignups(data);
      } finally {
        setLoadingSignups(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleManage = () => {
    setShowEditDialog(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setShowDeleteModal(false);

    try {
      console.log('Deleting event:', event.event_id);
      await deleteEvent(event.event_id);
      console.log('Event deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to delete event:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(`${t('ux.toast.deleteEventFailed')}: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const location = event.venue?.name || t('user.locationTbd');
  const isUpcoming = new Date(event.start_time) > new Date();
  const isPast = new Date(event.end_time) < new Date();
  const isOngoing = !isUpcoming && !isPast;

  return (
    <div className="bg-card border border-border rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow space-y-4">
      {/* Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground leading-tight mb-1">
            {event.name}
          </h3>
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
            isOngoing
              ? 'bg-green-100 text-green-800'
              : isUpcoming
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {isOngoing
            ? t('host.events.status.ongoing')
            : isUpcoming
              ? t('host.events.status.upcoming')
              : t('host.events.status.past')}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0 text-primary" />
          <span>{formatDateTime(event.start_time, locale)}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-primary" />
          <span>{formatDateTime(event.end_time, locale)}</span>
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0 text-primary" />
          <span>{location}</span>
        </div>
      </div>

      {/* Signup Stats & Participant Dropdown */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-foreground font-medium">
            <Users className="w-4 h-4 text-primary" />
            {t('host.events.signupCount', { count: stats.total })}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <UserCheck className="w-4 h-4 text-green-600" />
            {t('host.events.checkedInCount', { count: stats.checkedIn })}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border border-border rounded-lg overflow-hidden">
          {loadingSignups ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : signups.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              {t('host.events.noSignups')}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border max-h-48 overflow-y-auto">
                {signups.map((signup) => (
                  <div
                    key={signup.signup_id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span className="text-foreground truncate">
                      {signup.profile?.nickname || t('host.events.anonymousUser')}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        signup.checked_in
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {signup.checked_in
                        ? t('host.events.checkedInLabel')
                        : t('host.events.notCheckedInLabel')}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/host/live/checkin"
                className="block text-center px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors border-t border-border"
              >
                {t('host.events.participants.viewAll')}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleManage}
          className="flex-1 flex items-center justify-center gap-2 px-button h-button rounded-button bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          <Settings className="w-4 h-4" />
          {t('host.events.manage')}
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={deleting}
          className="px-button h-button rounded-button border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edit Event Dialog */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-start gap-3 p-6 border-b border-border">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {t('host.events.deleteModalTitle')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('host.events.deleteModalMessage')}
                </p>
              </div>
              <button
                onClick={handleCancelDelete}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Info */}
            <div className="p-6 space-y-2">
              <p className="font-medium text-foreground">{event.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(event.start_time, locale)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-button h-button rounded-button border border-border hover:bg-muted transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-button h-button rounded-button bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
