'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/context';
import {
  createUserEvent,
  getMyCreatedEvents,
  deleteUserEvent,
  updateUserEvent,
  getUserEventParticipants,
  getEventShareCode,
  removeParticipant,
} from '@/lib/api/user-events';
import type { Event, Signup } from '@/types/domain';
import {
  Plus, Calendar, Users, Trash2, X, Share2,
  ChevronDown, ChevronUp, Loader2, Copy, UserMinus, AlertTriangle,
} from 'lucide-react';

const DURATION_OPTIONS = [30, 60, 90, 120, 150, 180];
function formatDuration(minutes: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return t('host.events.durationMinutes', { n: mins });
  if (mins === 0) return t('host.events.durationHours', { n: hours });
  return t('host.events.durationHoursMinutes', { h: hours, m: mins });
}

function computeEndTime(startTime: string, durationMinutes: number): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

function getEventStatus(event: Event): 'upcoming' | 'ongoing' | 'passed' | 'cancelled' {
  if (event.status === 'cancelled') return 'cancelled';
  if (event.status === 'passed') return 'passed';
  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);
  if (now < start) return 'upcoming';
  if (now <= end) return 'ongoing';
  return 'passed';
}

// ─── Create Event Dialog ──────────────────────────────────────────────────────

function CreateSmallEventDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    duration: 60,
    max_participants: 5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.start_time) {
      toast.error(t('userEvents.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      const endTime = computeEndTime(formData.start_time, formData.duration);
      await createUserEvent({
        name: formData.name,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: endTime,
        max_participants: formData.max_participants,
      });
      toast.success(t('userEvents.createSuccess'));
      onSuccess();
    } catch (err) {
      console.error('Failed to create event:', err);
      toast.error(t('userEvents.createFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-semibold text-foreground">{t('userEvents.createTitle')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('userEvents.eventName')} <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('userEvents.eventNamePlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('userEvents.eventDescription')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('userEvents.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('userEvents.startTime')} <span className="text-destructive">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('userEvents.duration')}
            </label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>{formatDuration(m, t)}</option>
              ))}
            </select>
          </div>

          {/* Max Participants */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t('userEvents.maxParticipants')}
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setFormData({ ...formData, max_participants: n })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.max_participants === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {n} {t('userEvents.people')}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t('userEvents.maxParticipantsHint')}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('userEvents.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Event Card ─────────────────────────────────────────────────────────────

function UserEventCard({
  event,
  onUpdate,
}: {
  event: Event;
  onUpdate: () => void;
}) {
  const { t, locale } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [participants, setParticipants] = useState<Signup[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = getEventStatus(event);

  const statusStyles: Record<string, string> = {
    upcoming: 'bg-blue-50 text-blue-700',
    ongoing: 'bg-green-50 text-green-700',
    passed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-50 text-red-600',
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && participants.length === 0) {
      setLoadingParticipants(true);
      try {
        const [parts, code] = await Promise.all([
          getUserEventParticipants(event.event_id),
          getEventShareCode(event.event_id),
        ]);
        setParticipants(parts);
        setShareCode(code);
      } catch {
        /* ignore */
      } finally {
        setLoadingParticipants(false);
      }
    }
  };

  const handleCopyCode = async () => {
    if (!shareCode) return;
    const url = `${window.location.origin}/e/${shareCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('userEvents.linkCopied'));
    } catch {
      toast.error(t('userEvents.copyFailed'));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteUserEvent(event.event_id);
      toast.success(t('userEvents.deleteSuccess'));
      onUpdate();
    } catch {
      toast.error(t('userEvents.deleteFailed'));
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const handleCancel = async () => {
    try {
      await updateUserEvent(event.event_id, { status: 'cancelled' });
      toast.success(t('userEvents.cancelSuccess'));
      onUpdate();
    } catch {
      toast.error(t('userEvents.cancelFailed'));
    }
  };

  const handleRemoveParticipant = async (userId: string) => {
    const ok = await removeParticipant(event.event_id, userId);
    if (ok) {
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      toast.success(t('userEvents.participantRemoved'));
    }
  };

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${status === 'passed' || status === 'cancelled' ? 'opacity-70' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusStyles[status]}`}>
                {t(`userEvents.status.${status}`)}
              </span>
              {event.max_participants && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 shrink-0">
                  <Users className="w-3 h-3 inline mr-0.5" />
                  {event.max_participants}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(event.start_time)} — {formatDate(event.end_time)}</span>
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
            )}
          </div>

          <button
            onClick={handleExpand}
            className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Share link */}
          {shareCode && status !== 'cancelled' && status !== 'passed' && (
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
              <Share2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground flex-1 truncate">
                {window.location.origin}/e/{shareCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Copy className="w-3 h-3" />
                {t('userEvents.copyLink')}
              </button>
            </div>
          )}

          {/* Participants */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('userEvents.participants')}
              {participants.length > 0 && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({participants.length}/{event.max_participants ?? '∞'})
                </span>
              )}
            </h4>

            {loadingParticipants ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('userEvents.noParticipants')}</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.user_id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {p.profile?.nickname || p.user_id.slice(0, 8)}
                      </span>
                      {p.checked_in && (
                        <span className="text-xs text-green-600">{t('userEvents.checkedIn')}</span>
                      )}
                    </div>
                    {status !== 'passed' && status !== 'cancelled' && (
                      <button
                        onClick={() => handleRemoveParticipant(p.user_id)}
                        className="p-1.5 hover:bg-red-50 text-muted-foreground hover:text-red-600 rounded-lg transition-colors"
                        title={t('userEvents.removeParticipant')}
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {(status === 'upcoming' || status === 'ongoing') && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {t('userEvents.cancelEvent')}
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {(status === 'passed' || status === 'cancelled') && (
            <button
              onClick={() => setShowDelete(true)}
              className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{t('common.confirmDelete')}</h3>
                <p className="text-sm text-muted-foreground">{t('userEvents.deleteConfirm')}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                disabled={deleting}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function MyEventsPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyCreatedEvents();
      setEvents(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcomingEvents = events.filter((e) => {
    const s = getEventStatus(e);
    return s === 'upcoming' || s === 'ongoing';
  });
  const pastEvents = events.filter((e) => {
    const s = getEventStatus(e);
    return s === 'passed' || s === 'cancelled';
  });

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('userEvents.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('userEvents.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('userEvents.createButton')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('common.loading')}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-muted/30 border border-dashed border-border rounded-xl p-10 text-center space-y-3">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <div>
            <p className="text-sm font-medium text-foreground">{t('userEvents.empty')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('userEvents.emptyHint')}</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('userEvents.createFirst')}
          </button>
        </div>
      ) : (
        <>
          {/* Upcoming / ongoing */}
          {upcomingEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('userEvents.upcoming')}</h2>
              {upcomingEvents.map((ev) => (
                <UserEventCard key={ev.event_id} event={ev} onUpdate={load} />
              ))}
            </section>
          )}

          {/* Past / cancelled */}
          {pastEvents.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">{t('userEvents.past')}</h2>
              {pastEvents.map((ev) => (
                <UserEventCard key={ev.event_id} event={ev} onUpdate={load} />
              ))}
            </section>
          )}
        </>
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateSmallEventDialog
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
