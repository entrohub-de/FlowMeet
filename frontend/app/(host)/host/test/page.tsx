'use client';

import { useCallback, useEffect, useState } from 'react';
import { FlaskConical, RefreshCw, Trash2, UserCheck, Users } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import { getTestUsers, batchCheckinUsers, cleanupTestData, type TestUser } from '@/lib/api/test-utils';
import type { Event } from '@/types/domain';

export default function TestControlPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    getEvents().then((data) => {
      setEvents(data);
      if (data.length > 0) setSelectedEventId(data[0].event_id);
    });
  }, []);

  const loadUsers = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const data = await getTestUsers(selectedEventId);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedEventId) loadUsers();
  }, [selectedEventId, loadUsers]);

  const handleBatchCheckin = async () => {
    if (!selectedEventId) return;
    const unchecked = users.filter((u) => !u.isCheckedIn).map((u) => u.userId);
    if (unchecked.length === 0) {
      setActionMessage(t('testPanel.allCheckedIn'));
      return;
    }
    setLoading(true);
    try {
      const success = await batchCheckinUsers(selectedEventId, unchecked);
      setActionMessage(
        success
          ? t('testPanel.checkinSuccess', { count: unchecked.length })
          : t('testPanel.checkinFailed')
      );
      await loadUsers();
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const result = await cleanupTestData(selectedEventId);
      setActionMessage(
        t('testPanel.cleanupDone', {
          matches: result.matchesDeleted,
          groups: result.groupsDeleted,
        })
      );
      await loadUsers();
    } finally {
      setLoading(false);
    }
  };

  const checkedInCount = users.filter((u) => u.isCheckedIn).length;

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">{t('testPanel.title')}</h1>
        </div>

        {/* Event selector */}
        <div className="bg-card border border-border rounded-xl p-4">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            {t('testPanel.selectEvent')}
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
          >
            {events.map((evt) => (
              <option key={evt.event_id} value={evt.event_id}>
                {evt.name}
              </option>
            ))}
          </select>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">
            {actionMessage}
          </div>
        )}

        {/* Actions */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">{t('testPanel.actions')}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2 bg-muted border border-border rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('testPanel.refresh')}
            </button>
            <button
              onClick={handleBatchCheckin}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              {t('testPanel.batchCheckin')}
            </button>
            <button
              onClick={handleCleanup}
              disabled={loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('testPanel.cleanup')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {t('testPanel.scriptHint')}
          </p>
        </div>

        {/* User list */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t('testPanel.usersTitle')} ({users.length})
            </h2>
            <span className="text-sm text-muted-foreground">
              {t('testPanel.checkedInCount', { count: checkedInCount, total: users.length })}
            </span>
          </div>

          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">
              {t('testPanel.noUsers')}
            </p>
          ) : (
            <div className="grid gap-2">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                    {user.profile?.nickname?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {user.profile?.nickname || user.userId.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.profile?.gender || ''} {user.profile?.age_group || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.isCheckedIn ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                        {t('testPanel.checkedIn')}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                        {t('testPanel.notCheckedIn')}
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
  );
}
