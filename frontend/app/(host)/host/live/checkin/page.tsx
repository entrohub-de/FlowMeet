'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getEventSignups } from '@/lib/api/signup';
import type { Event, Signup } from '@/types/domain';
import { UserCheck, Plus, Search, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import { CheckinDialog } from '@/components/checkin/CheckinDialog';

type FilterType = 'all' | 'checkedIn' | 'notCheckedIn';

export default function CheckinPage() {
  const { t, locale } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckinDialog, setShowCheckinDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const eventsData = await getEvents();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const upcomingEvents = eventsData.filter(
          (e) => new Date(e.start_time) >= todayStart
        );
        setEvents(upcomingEvents);
        if (upcomingEvents.length > 0) {
          setSelectedEventId(upcomingEvents[0].event_id);
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

  const selectedEvent = events.find(e => e.event_id === selectedEventId);
  const checkedInCount = signups.filter(s => s.checked_in).length;

  const filteredSignups = useMemo(() => {
    let list = signups;
    if (filter === 'checkedIn') list = list.filter(s => s.checked_in);
    if (filter === 'notCheckedIn') list = list.filter(s => !s.checked_in);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.profile?.nickname?.toLowerCase().includes(q));
    }
    return list;
  }, [signups, filter, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Event Selection + Checkin Button */}
        <div className="mb-4 space-y-2">
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

          {selectedEventId && (
            <button
              onClick={() => setShowCheckinDialog(true)}
              className="w-full flex items-center justify-center gap-2 px-4 h-10 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              {t('checkin.checkinParticipant')}
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {selectedEvent && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-0.5">{t('user.checkedIn')}</div>
              <div className="text-2xl font-bold text-primary">{checkedInCount}</div>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-0.5">{t('host.events.totalSignups')}</div>
              <div className="text-2xl font-bold text-foreground">{signups.length}</div>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-sm">
              <div className="text-xs text-muted-foreground mb-0.5">{t('checkin.checkinRate')}</div>
              <div className="text-2xl font-bold text-foreground">
                {signups.length > 0 ? Math.round((checkedInCount / signups.length) * 100) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-card border border-border rounded-xl shadow-sm">
          <div className="p-4 sm:p-6 border-b border-border space-y-3">
            <h2 className="text-xl font-semibold text-foreground">{t('host.events.participantsList')}</h2>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('host.events.participants.searchPlaceholder')}
                  className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-1 bg-muted/50 border border-border rounded-lg p-0.5">
                {(['all', 'checkedIn', 'notCheckedIn'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {t(`host.events.participants.filter.${f}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            {signups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('checkin.noParticipants')}</p>
              </div>
            ) : filteredSignups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('host.events.participants.noResults')}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSignups.map((signup, index) => {
                  const isExpanded = expandedId === signup.signup_id;
                  return (
                    <div key={signup.signup_id}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : signup.signup_id)}
                        className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        {signup.profile?.avatar_url ? (
                          <img
                            src={signup.profile.avatar_url}
                            alt={signup.profile?.nickname || ''}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-medium text-primary">
                              {signup.profile?.nickname?.[0]?.toUpperCase() || (index + 1)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground truncate">
                              {signup.profile?.nickname || t('user.anonymous')}
                            </span>
                            {signup.profile?.gender && (
                              <span className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground shrink-0">
                                {signup.profile.gender}
                              </span>
                            )}
                            {signup.profile?.age_group && (
                              <span className="px-1.5 py-0.5 bg-muted rounded text-xs text-muted-foreground shrink-0">
                                {signup.profile.age_group}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(signup.signup_timestamp || signup.created_at).toLocaleString(
                              locale === 'zh' ? 'zh-CN' : 'en-US',
                              { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              signup.checked_in
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {signup.checked_in ? t('user.checkedIn') : t('user.notCheckedIn')}
                          </span>
                          {signup.expectation?.content && (
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 sm:px-6 pb-4 pt-1 ml-11 space-y-2">
                          {signup.checked_in && signup.checked_in_at && (
                            <div className="text-xs text-muted-foreground">
                              {t('host.events.participants.checkedInAt', {
                                time: new Date(signup.checked_in_at).toLocaleString(
                                  locale === 'zh' ? 'zh-CN' : 'en-US',
                                  { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                                ),
                              })}
                            </div>
                          )}
                          {signup.expectation?.content ? (
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">
                                {t('host.events.participants.expectation')}
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                  {signup.expectation.content}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground italic">
                              {t('host.events.participants.noExpectation')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
