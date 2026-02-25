'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getEvents } from '@/lib/api/events';
import type { Event } from '@/types/domain';
import { getActiveFlow, upsertActiveFlow } from '@/lib/api/active-flows';
import { broadcastPermissionChange } from '@/lib/realtime/flow-broadcast';
import PermissionPanel from '@/components/workflow/flow-control/PermissionPanel';
import { useAutoMatching } from '@/hooks/useAutoMatching';
import { logHostAction } from '@/lib/api/host-actions';
import { generateGroups, persistGroups } from '@/lib/api/auto-grouping';
import type { ActiveFlowPermissions } from '@/types/domain';

export default function FlowControlPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Permission model state
  const [permissions, setPermissions] = useState<ActiveFlowPermissions>({
    matching_1v1_enabled: false,
    matching_group_enabled: false,
    matching_mixed_group_enabled: false,
  });
  const [mixedGroupGenerating, setMixedGroupGenerating] = useState(false);

  const STORAGE_KEY = 'flowmeet_host_selected_event';
  const EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 hours

  useEffect(() => {
    const init = async () => {
      try {
        const eventsData = await getEvents();
        const activeEvents = eventsData.filter((e) => e.status === 'active');
        setEvents(activeEvents);

        // Restore from localStorage if within 3 hours
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const { eventId, timestamp } = JSON.parse(stored);
            if (Date.now() - timestamp < EXPIRY_MS && activeEvents.some((e) => e.event_id === eventId)) {
              setSelectedEventId(eventId);
              return;
            }
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch { /* ignore parse errors */ }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Restore permissions from DB on event change
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedEventId || restoredRef.current === selectedEventId) return;
    let cancelled = false;

    const restore = async () => {
      try {
        const activeFlow = await getActiveFlow(selectedEventId);
        if (cancelled) return;

        if (activeFlow?.permissions) {
          setPermissions(activeFlow.permissions);
        } else {
          setPermissions({ matching_1v1_enabled: false, matching_group_enabled: false, matching_mixed_group_enabled: false });
        }
        restoredRef.current = selectedEventId;
      } catch (error) {
        console.error('Failed to restore permissions:', error);
      }
    };

    restore();
    return () => { cancelled = true; };
  }, [selectedEventId]);

  // Auto-matching engine (permission model)
  // observePresence: subscribe to presence channel even if 1v1 is off (for mixed group to read online users)
  const needsPresence = permissions.matching_group_enabled || permissions.matching_mixed_group_enabled;
  const { stats: autoMatchingStats, error: autoMatchingError, triggerManualRound } = useAutoMatching(
    selectedEventId,
    permissions.matching_1v1_enabled,
    needsPresence
  );

  // Permission toggle handler
  const handleTogglePermission = useCallback(async (key: 'matching_1v1_enabled' | 'matching_group_enabled' | 'matching_mixed_group_enabled') => {
    if (!selectedEventId) return;
    const newPermissions = { ...permissions, [key]: !permissions[key] };
    setPermissions(newPermissions);
    try {
      await upsertActiveFlow(selectedEventId, { permissions: newPermissions });
      broadcastPermissionChange(selectedEventId, newPermissions, key);
      logHostAction(selectedEventId, newPermissions[key] ? 'permission_enabled' : 'permission_disabled', { key });
    } catch (error) {
      console.error('Failed to toggle permission:', error);
      setPermissions(permissions); // rollback
    }
  }, [selectedEventId, permissions]);

  // Handle event switch
  const handleEventChange = useCallback((eventId: string) => {
    if (eventId === selectedEventId) return;
    setSelectedEventId(eventId);
    setPermissions({ matching_1v1_enabled: false, matching_group_enabled: false, matching_mixed_group_enabled: false });
    restoredRef.current = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ eventId, timestamp: Date.now() }));
    } catch { /* quota exceeded etc */ }
  }, [selectedEventId]);

  // Auto-generate mixed groups when permission is toggled on and online users are available
  const mixedGroupTriggeredRef = useRef(false);
  useEffect(() => {
    if (!permissions.matching_mixed_group_enabled || !selectedEventId) {
      mixedGroupTriggeredRef.current = false;
      return;
    }
    if (mixedGroupTriggeredRef.current) return;
    const userIds = autoMatchingStats.presentUserIds;
    if (userIds.length < 2) return;

    mixedGroupTriggeredRef.current = true;
    setMixedGroupGenerating(true);

    (async () => {
      try {
        const { groups } = await generateGroups(selectedEventId, userIds, 5);
        if (groups.length > 0) {
          await persistGroups(groups, selectedEventId, 'mixed-group');
          logHostAction(selectedEventId, 'mixed_groups_generated', { groupCount: groups.length, totalUsers: userIds.length });
        }
      } catch (error) {
        console.error('Failed to generate mixed groups:', error);
      } finally {
        setMixedGroupGenerating(false);
      }
    })();
  }, [permissions.matching_mixed_group_enabled, selectedEventId, autoMatchingStats.presentUserIds]);

  // Event dropdown state
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setShowEventDropdown(false);
      }
    };
    if (showEventDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEventDropdown]);

  const selectedEvent = events.find((e) => e.event_id === selectedEventId);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* ── Event Selector Dropdown ── */}
        <div ref={eventDropdownRef} className="relative">
          <button
            type="button"
            onClick={() => events.length > 0 && setShowEventDropdown((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <span className="truncate">
              {selectedEvent?.name ?? t('host.flowControl.selectEvent')}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showEventDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showEventDropdown && events.length > 0 && (
            <div className="absolute left-0 z-50 mt-1 min-w-[260px] bg-background border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto">
              {events.map((event) => {
                const isSelected = event.event_id === selectedEventId;
                return (
                  <button
                    key={event.event_id}
                    type="button"
                    onClick={() => { handleEventChange(event.event_id); setShowEventDropdown(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {event.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Permission Panel ── */}
        {selectedEventId && (
          <PermissionPanel
            permissions={permissions}
            onTogglePermission={handleTogglePermission}
            autoMatchingStats={autoMatchingStats}
            autoMatchingError={autoMatchingError}
            onTriggerManualRound={triggerManualRound}
            mixedGroupGenerating={mixedGroupGenerating}
            onlineCount={autoMatchingStats.totalPresent}
            conversationCount={autoMatchingStats.totalPaired}
            idleCount={Math.max(0, autoMatchingStats.totalPresent - autoMatchingStats.totalPaired)}
          />
        )}
      </div>
    </div>
  );
}
