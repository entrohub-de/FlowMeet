'use client';

import { useTranslation } from '@/lib/i18n/context';
import { type Encounter } from '@/lib/api/connections';
import { Users, CalendarDays } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { useMemo } from 'react';

interface EncounterHistoryProps {
  encounters: Encounter[];
}

export function EncounterHistory({ encounters }: EncounterHistoryProps) {
  const { t } = useTranslation();

  const { deduped, grouped } = useMemo(() => {
    // Deduplicate by userId — keep only the first (most recent) encounter per person
    const seen = new Set<string>();
    const deduped: Encounter[] = [];
    for (const enc of encounters) {
      if (seen.has(enc.userId)) continue;
      seen.add(enc.userId);
      deduped.push(enc);
    }

    // Group by event for display
    const map = new Map<string, Encounter[]>();
    for (const enc of deduped) {
      const key = enc.eventName || enc.eventId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(enc);
    }
    return { deduped, grouped: Array.from(map.entries()) };
  }, [encounters]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Users className="w-4 h-4 text-primary" />
        {t('connections.encounterHistory')}
        <span className="text-xs font-normal text-muted-foreground ml-1">
          ({deduped.length})
        </span>
      </h2>

      {grouped.map(([eventName, encs]) => (
        <div key={eventName} className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span className="font-medium">{eventName}</span>
          </div>
          <div className="grid gap-2">
            {encs.map((enc, idx) => (
              <div
                key={`${enc.eventId}-${enc.userId}-${enc.type}-${idx}`}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
              >
                <UserAvatar avatarUrl={enc.avatar_url} name={enc.nickname} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {enc.nickname || t('user.anonymous')}
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  enc.type === '1v1'
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}>
                  {enc.type === '1v1' ? t('connections.type1v1') : t('connections.typeGroup')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
