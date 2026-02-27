'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users } from 'lucide-react';
import { getUserGroup, getGroupMembers } from '@/lib/api/groups';

const GROUP_COLORS = [
  { bg: 'bg-rose-500/10', border: 'border-rose-500', text: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
  { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500', text: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
  { bg: 'bg-violet-500/10', border: 'border-violet-500', text: 'text-violet-600 dark:text-violet-400', accent: 'bg-violet-500' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500', text: 'text-cyan-600 dark:text-cyan-400', accent: 'bg-cyan-500' },
  { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-600 dark:text-orange-400', accent: 'bg-orange-500' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500', text: 'text-pink-600 dark:text-pink-400', accent: 'bg-pink-500' },
];

interface MyGroup {
  name: string;
  groupIndex: number;
  members: Array<{ user_id: string; profile?: { nickname: string | null } }>;
}

interface MixedGroupSectionProps {
  t: (key: string) => string;
  eventId: string;
  userId: string | undefined;
}

export function MixedGroupSection({ t, eventId, userId }: MixedGroupSectionProps) {
  const [myGroup, setMyGroup] = useState<MyGroup | null>(null);
  const [loading, setLoading] = useState(false);

  const loadMyGroup = useCallback(async () => {
    if (!eventId || !userId) {
      setMyGroup(null);
      return;
    }
    setLoading(true);
    try {
      const group = await getUserGroup(eventId, userId);
      if (group) {
        const members = await getGroupMembers(group.group_id);
        const numMatch = group.name.match(/\d+/);
        const groupIndex = numMatch ? parseInt(numMatch[0], 10) - 1 : 0;
        setMyGroup({ name: group.name, groupIndex, members });
      } else {
        setMyGroup(null);
      }
    } catch {
      setMyGroup(null);
    } finally {
      setLoading(false);
    }
  }, [eventId, userId]);

  useEffect(() => {
    loadMyGroup();
  }, [loadMyGroup]);

  if (loading) {
    return <div className="animate-pulse h-40 bg-muted rounded-2xl" />;
  }

  if (myGroup) {
    const c = GROUP_COLORS[myGroup.groupIndex % GROUP_COLORS.length];
    return (
      <div className={`rounded-2xl border-2 ${c.border} ${c.bg} p-6 space-y-4 transition-all duration-500`}>
        <div className="text-center space-y-3">
          <div className={`w-16 h-16 mx-auto rounded-full ${c.accent} flex items-center justify-center`}>
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className={`text-xl font-bold ${c.text}`}>{myGroup.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('userFlow.mixedGroupTitle')}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{myGroup.members.length} {t('userFlow.memberCount')}</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="text-center py-4">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Users className="w-6 h-6 text-primary/40" />
        </div>
        <p className="text-sm text-muted-foreground">{t('userFlow.waitingForGroup')}</p>
      </div>
    </div>
  );
}
