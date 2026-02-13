'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { getHostActions } from '@/lib/api/host-actions';
import type { HostAction, HostActionType } from '@/types/domain';

interface ActionHistoryPanelProps {
  eventId: string;
}

const ACTION_COLORS: Record<string, string> = {
  // Flow operations - blue
  flow_applied: 'bg-blue-100 text-blue-700 border-blue-200',
  step_started: 'bg-blue-100 text-blue-700 border-blue-200',
  step_paused: 'bg-blue-100 text-blue-700 border-blue-200',
  step_resumed: 'bg-blue-100 text-blue-700 border-blue-200',
  step_completed: 'bg-blue-100 text-blue-700 border-blue-200',
  flow_paused: 'bg-blue-100 text-blue-700 border-blue-200',
  flow_resumed: 'bg-blue-100 text-blue-700 border-blue-200',
  flow_completed: 'bg-blue-100 text-blue-700 border-blue-200',
  flow_reset: 'bg-blue-100 text-blue-700 border-blue-200',
  // Matching operations - violet
  matching_triggered: 'bg-violet-100 text-violet-700 border-violet-200',
  grouping_triggered: 'bg-violet-100 text-violet-700 border-violet-200',
  // Manual operations - amber
  manual_pair: 'bg-amber-100 text-amber-700 border-amber-200',
  manual_unpair: 'bg-amber-100 text-amber-700 border-amber-200',
  manual_regroup: 'bg-amber-100 text-amber-700 border-amber-200',
  // Global controls - slate
  global_pause: 'bg-slate-100 text-slate-700 border-slate-200',
  global_resume: 'bg-slate-100 text-slate-700 border-slate-200',
};

const TIMELINE_DOT_COLORS: Record<string, string> = {
  flow_applied: 'bg-blue-500',
  step_started: 'bg-blue-500',
  step_paused: 'bg-blue-400',
  step_resumed: 'bg-blue-500',
  step_completed: 'bg-blue-600',
  flow_paused: 'bg-blue-400',
  flow_resumed: 'bg-blue-500',
  flow_completed: 'bg-blue-600',
  flow_reset: 'bg-blue-300',
  matching_triggered: 'bg-violet-500',
  grouping_triggered: 'bg-violet-500',
  manual_pair: 'bg-amber-500',
  manual_unpair: 'bg-amber-500',
  manual_regroup: 'bg-amber-500',
  global_pause: 'bg-slate-500',
  global_resume: 'bg-slate-500',
};

function relativeTime(isoString: string, t: (key: string, params?: Record<string, any>) => string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t('hostActions.history.justNow');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('hostActions.history.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  return t('hostActions.history.hoursAgo', { n: hours });
}

export default function ActionHistoryPanel({ eventId }: ActionHistoryPanelProps) {
  const { t } = useTranslation();
  const [actions, setActions] = useState<HostAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      const data = await getHostActions(eventId);
      setActions(data);
    } catch (error) {
      console.error('Failed to fetch host actions:', error);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchActions();
    // Auto-refresh every 30 seconds
    intervalRef.current = setInterval(fetchActions, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActions]);

  const getActionLabel = (actionType: HostActionType): string => {
    return t(`hostActions.actionTypes.${actionType}`);
  };

  const renderMetadata = (action: HostAction) => {
    const meta = action.metadata;
    if (!meta || Object.keys(meta).length === 0) return null;

    const parts: string[] = [];
    if (meta.templateName) parts.push(meta.templateName);
    if (meta.stepTitle) parts.push(meta.stepTitle);
    if (meta.readyCount != null) parts.push(`${meta.readyCount} ${t('hostActions.history.ready')}`);
    if (meta.groupSize != null) parts.push(`${t('hostActions.history.groupSize')}: ${meta.groupSize}`);

    if (parts.length === 0) return null;
    return <span className="text-xs text-muted-foreground ml-1">({parts.join(', ')})</span>;
  };

  return (
    <div className="mb-4 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <History className="w-4 h-4" />
          {t('hostActions.history.title')}
          <span className="text-xs text-muted-foreground font-normal">
            ({actions.length})
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">{t('common.loading')}</div>
          ) : actions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t('hostActions.history.empty')}
            </div>
          ) : (
            <div className="relative pl-6">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

              {actions.map((action) => (
                <div key={action.action_id} className="relative mb-3 last:mb-0">
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                      TIMELINE_DOT_COLORS[action.action_type] ?? 'bg-muted-foreground'
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
                        ACTION_COLORS[action.action_type] ?? 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {getActionLabel(action.action_type)}
                    </span>
                    {renderMetadata(action)}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {relativeTime(action.created_at, t)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
