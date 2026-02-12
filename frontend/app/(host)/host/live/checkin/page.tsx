'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getEventSignups } from '@/lib/api/signup';
import type { Event, Signup } from '@/types/domain';
import { UserCheck, Plus } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import { CheckinDialog } from '@/components/checkin/CheckinDialog';

export default function CheckinPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        setEvents(eventsData);
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].event_id);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const loadSignupsForEvent = useCallback(async () => {
    if (!selectedEventId) return;

    try {
      const signupsData = await getEventSignups(selectedEventId);
      setSignups(signupsData);
    } catch (error) {
      console.error('Failed to load signups:', error);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadSignupsForEvent();
  }, [loadSignupsForEvent]);

  const handleCheckinSuccess = () => {
    loadSignupsForEvent();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.event_id === selectedEventId);
  const checkedInCount = signups.filter(s => s.checked_in).length;

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Event Selection */}
        <div className="mb-6 space-y-4">
          {/* Event Selector */}
          {events.length > 0 && (
            <CustomSelect
              options={events.map((event) => ({
                value: event.event_id,
                label: event.name,
              }))}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder={t('checkin.selectEvent')}
              className="w-full md:w-auto md:min-w-[300px] shadow-sm"
            />
          )}

          {/* Checkin Button */}
          {selectedEventId && (
            <button
              onClick={() => setShowCheckinDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              {t('checkin.checkinParticipant')}
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {selectedEvent && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-sm text-muted-foreground mb-2">{t('host.events.totalSignups')}</div>
              <div className="text-3xl font-bold text-foreground">{signups.length}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-sm text-muted-foreground mb-2">{t('user.checkedIn')}</div>
              <div className="text-3xl font-bold text-primary">{checkedInCount}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="text-sm text-muted-foreground mb-2">{t('checkin.checkinRate')}</div>
              <div className="text-3xl font-bold text-foreground">
                {signups.length > 0 ? Math.round((checkedInCount / signups.length) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">{t('host.events.participantsList')}</h2>
          </div>
          <div className="p-6">
            {signups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('checkin.noParticipants')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {signups.map((signup) => (
                  <div
                    key={signup.signup_id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {signup.profile?.nickname || t('user.anonymous')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(signup.signup_timestamp || signup.created_at).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                    <div>
                      {signup.checked_in ? (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                          {t('user.checkedIn')}
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                          {t('user.notCheckedIn')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkin Dialog */}
      {showCheckinDialog && (
        <CheckinDialog
          eventId={selectedEventId}
          onClose={() => setShowCheckinDialog(false)}
          onSuccess={handleCheckinSuccess}
        />
      )}
    </div>
  );
}
