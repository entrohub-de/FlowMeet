'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Globe, Sparkles, Briefcase, Info, Rocket } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { supabase } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import type { Preferences } from '@/types/domain';
import type { GroupMemberInfo } from '@/hooks/useFlowGroupMatching';

interface GroupDetailCardProps {
  groupId: string;
  members: GroupMemberInfo[];
}

export default function GroupDetailCard({ groupId, members }: GroupDetailCardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupDescription, setGroupDescription] = useState<string | null>(null);
  const [preferencesMap, setPreferencesMap] = useState<Map<string, Preferences>>(new Map());
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const memberIds = members.map(m => m.userId);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [groupResult, prefResult] = await Promise.all([
          supabase
            .from('evt_groups')
            .select('name, description')
            .eq('group_id', groupId)
            .single(),
          memberIds.length > 0
            ? supabase
                .from('usr_preferences')
                .select('*')
                .in('user_id', memberIds)
            : Promise.resolve({ data: null }),
        ]);

        if (cancelled) return;

        if (groupResult.data) {
          setGroupName(groupResult.data.name);
          setGroupDescription(groupResult.data.description);
        }

        if (prefResult.data) {
          const map = new Map<string, Preferences>();
          prefResult.data.forEach((p: Preferences) => map.set(p.user_id, p));
          setPreferencesMap(map);
        }
      } catch (err) {
        console.error('Failed to fetch group details:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [groupId, members]);

  const toggleMember = (userId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="pt-3 border-t border-emerald-200 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const hasAnyPreferences = Array.from(preferencesMap.values()).some(
    p => p.languages || p.interests || p.industry_background || p.startup_stage
  );

  if (!groupName && !hasAnyPreferences) {
    return null;
  }

  return (
    <div className="pt-3 border-t border-emerald-200 space-y-3 animate-slide-up-fade">
      {/* Group info */}
      {groupName && (
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <span className="text-sm font-medium text-foreground">{groupName}</span>
            {groupDescription && (
              <p className="text-xs text-muted-foreground mt-0.5">{groupDescription}</p>
            )}
          </div>
        </div>
      )}

      {/* Member preferences */}
      {hasAnyPreferences && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-muted-foreground">
            {t('groupDetail.memberPreferences')}
          </span>
          <div className="space-y-1">
            {members.map(member => {
              const pref = preferencesMap.get(member.userId);
              const hasPref = pref && (
                pref.languages || pref.interests || pref.industry_background || pref.startup_stage
              );
              if (!hasPref) return null;

              const isExpanded = expandedMembers.has(member.userId);

              return (
                <div key={member.userId} className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 overflow-hidden">
                  <button
                    onClick={() => toggleMember(member.userId)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-emerald-100/50 transition-colors"
                  >
                    <span className="font-medium">
                      {member.profile?.nickname || t('user.anonymous')}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && pref && (
                    <div className="px-3 pb-3 grid gap-2 animate-slide-up-fade">
                      {pref.languages && (
                        <div className="flex items-start gap-2 text-sm">
                          <Globe className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-muted-foreground">{t('groupDetail.languages')}</span>
                            <p className="text-foreground text-xs">{pref.languages}</p>
                          </div>
                        </div>
                      )}
                      {pref.interests && (
                        <div className="flex items-start gap-2 text-sm">
                          <Sparkles className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-muted-foreground">{t('groupDetail.interests')}</span>
                            <p className="text-foreground text-xs">{pref.interests}</p>
                          </div>
                        </div>
                      )}
                      {pref.startup_stage && (
                        <div className="flex items-start gap-2 text-sm">
                          <Rocket className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-muted-foreground">{t('groupDetail.startupStage')}</span>
                            <p className="text-foreground text-xs">{pref.startup_stage}</p>
                          </div>
                        </div>
                      )}
                      {pref.industry_background && (
                        <div className="flex items-start gap-2 text-sm">
                          <Briefcase className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="text-xs text-muted-foreground">{t('groupDetail.professionalBackground')}</span>
                            <p className="text-foreground text-xs">{pref.industry_background}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
