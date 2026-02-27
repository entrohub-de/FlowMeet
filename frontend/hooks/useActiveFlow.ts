'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEvents } from '@/lib/api/events';
import { getActiveFlow } from '@/lib/api/active-flows';
import { getUserSignups } from '@/lib/api/signup';
import { subscribeToFlow, type FlowBroadcastPayload } from '@/lib/realtime/flow-broadcast';
import { supabase } from '@/lib/supabase/client';
import type { ActiveFlowPermissions, Event, ActiveFlowStep } from '@/types/domain';

type FlowStatus = 'pending' | 'active' | 'paused' | 'completed';

export interface FlowStep {
  id: string;
  title: string;
  duration: number;
  status: FlowStatus;
  remainingSeconds: number;
  pairingMode?: 'group' | '1v1';
}

export interface ActiveFlowState {
  flowStatus: 'idle' | 'running' | 'paused' | 'completed';
  templateName: string;
  steps: FlowStep[];
  permissions: ActiveFlowPermissions | null;
}

function applyBroadcastPayload(payload: FlowBroadcastPayload): ActiveFlowState {
  const steps: FlowStep[] = payload.steps.map((step) => {
    if (
      step.status === 'active' &&
      payload.activeStepStartedAt &&
      payload.activeStepRemainingSeconds != null
    ) {
      const elapsed = Math.floor(
        (Date.now() - new Date(payload.activeStepStartedAt).getTime()) / 1000
      );
      return { ...step, remainingSeconds: payload.activeStepRemainingSeconds - elapsed };
    }
    return step;
  });

  return {
    flowStatus: payload.flowStatus as ActiveFlowState['flowStatus'],
    templateName: payload.templateName ?? '',
    steps,
    permissions: null,
  };
}

export function useActiveFlow() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<ActiveFlowState | null>(null);

  // Load events
  useEffect(() => {
    const load = async () => {
      try {
        const [data, { data: { user } }] = await Promise.all([
          getEvents(),
          supabase.auth.getUser(),
        ]);
        setEvents(data);
        if (data.length > 0) {
          // Filter to user's signed-up events if logged in
          let candidates = data;
          if (user) {
            const signupMap = await getUserSignups(user.id);
            const signedUp = data.filter((ev) => signupMap.has(ev.event_id));
            if (signedUp.length > 0) candidates = signedUp;
          }
          const now = Date.now();
          let best = candidates[0];
          let bestDist = Infinity;
          for (const ev of candidates) {
            const start = new Date(ev.start_time).getTime();
            const end = new Date(ev.end_time).getTime();
            const dist = (now >= start && now <= end) ? 0 : Math.min(Math.abs(now - start), Math.abs(now - end));
            if (dist < bestDist) {
              bestDist = dist;
              best = ev;
            }
          }
          setSelectedEventId(best.event_id);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Fetch active flow from DB + subscribe to broadcast
  useEffect(() => {
    if (!selectedEventId) return;
    let cancelled = false;

    const fetchAndSubscribe = async () => {
      try {
        const activeFlow = await getActiveFlow(selectedEventId);
        if (cancelled) return;

        if (activeFlow) {
          const dbSteps = (activeFlow.steps as ActiveFlowStep[]) || [];
          const steps: FlowStep[] = dbSteps.map((step) => {
            if (
              step.status === 'active' &&
              activeFlow.active_step_started_at &&
              activeFlow.active_step_remaining_seconds != null
            ) {
              const elapsed = Math.floor(
                (Date.now() - new Date(activeFlow.active_step_started_at).getTime()) / 1000
              );
              return { ...step, remainingSeconds: activeFlow.active_step_remaining_seconds - elapsed };
            }
            return step;
          });
          setFlowState({
            flowStatus: activeFlow.flow_status as ActiveFlowState['flowStatus'],
            templateName: activeFlow.template_name,
            steps,
            permissions: activeFlow.permissions ?? null,
          });

        } else {
          setFlowState(null);
        }
      } catch (error) {
        console.error('Failed to fetch active flow:', error);
        if (!cancelled) setFlowState(null);
      }
    };

    fetchAndSubscribe();

    // Subscribe to broadcast
    const channel = subscribeToFlow(selectedEventId, {
      onFlowApplied: (payload) => {
        if (!cancelled) setFlowState(applyBroadcastPayload(payload));
      },
      onStepChanged: (payload) => {
        if (!cancelled) setFlowState(applyBroadcastPayload(payload));
      },
      onFlowReset: () => {
        if (!cancelled) setFlowState(null);
      },
      onPermissionChanged: (permissions) => {
        if (!cancelled) {
          setFlowState((prev) => prev ? { ...prev, permissions } : prev);
        }
      },
    });

    // Re-fetch active flow when page becomes visible (e.g. phone unlocked, tab switched back)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        fetchAndSubscribe();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      channel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedEventId]);

  // Local timer for active step
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    const hasActive = flowState?.steps.some((s) => s.status === 'active');
    if (!hasActive) return;

    timerRef.current = setInterval(() => {
      setFlowState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map((step) =>
            step.status === 'active'
              ? { ...step, remainingSeconds: step.remainingSeconds - 1 }
              : step
          ),
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [flowState?.steps.map((s) => `${s.id}:${s.status}`).join(',')]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(Math.abs(totalSeconds) / 60);
    const secs = Math.abs(totalSeconds) % 60;
    const sign = totalSeconds < 0 ? '-' : '';
    return `${sign}${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const activeStep = useMemo(
    () => flowState?.steps.find((s) => s.status === 'active' || s.status === 'paused'),
    [flowState?.steps]
  );

  const totalDuration = useMemo(
    () => flowState?.steps.reduce((sum, step) => sum + step.duration, 0) ?? 0,
    [flowState?.steps]
  );

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    loading,
    flowState,
    activeStep,
    totalDuration,
    formatTime,
  };
}
