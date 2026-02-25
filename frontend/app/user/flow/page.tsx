'use client';

import { useState, useEffect, useCallback } from 'react';
import { PauseCircle, Users, Code, Briefcase } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import { useAuth } from '@/features/auth/useAuth';
import { useActiveFlow } from '@/hooks/useActiveFlow';
import { useFlowMatching } from '@/hooks/useFlowMatching';
import { useGroupIdentity, type IdentityType } from '@/hooks/useGroupIdentity';
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
import { getUserGroup, getGroupMembers } from '@/lib/api/groups';

export default function UserFlowPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    loading,
    selectedEventId,
    flowState,
    isGloballyPaused,
    globalPauseMessage,
  } = useActiveFlow();

  const permissions = flowState?.permissions ?? null;
  const matching1v1Enabled = permissions?.matching_1v1_enabled ?? false;
  const groupEnabled = permissions?.matching_group_enabled ?? false;
  const mixedGroupEnabled = permissions?.matching_mixed_group_enabled ?? false;

  const { state: matchingState, goReady, cancelReady, finishChat, rejoin } = useFlowMatching(
    selectedEventId,
    '1v1',
    matching1v1Enabled
  );

  const { state: identityState, setIdentity } = useGroupIdentity(
    selectedEventId,
    groupEnabled
  );

  // Join Presence channel when non-1v1 features are enabled (so host can see online users)
  // Skip if 1v1 is already enabled — useFlowMatching handles presence in that case
  usePresenceTracker(
    selectedEventId,
    groupEnabled || mixedGroupEnabled,
    matching1v1Enabled
  );

  // Mixed group state
  const [myGroup, setMyGroup] = useState<{ name: string; groupIndex: number; members: Array<{ user_id: string; profile?: { nickname: string | null } }> } | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);

  const loadMyGroup = useCallback(async () => {
    if (!selectedEventId || !user?.id || !mixedGroupEnabled) {
      setMyGroup(null);
      return;
    }
    setGroupLoading(true);
    try {
      const group = await getUserGroup(selectedEventId, user.id);
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
      setGroupLoading(false);
    }
  }, [selectedEventId, user?.id, mixedGroupEnabled]);

  useEffect(() => {
    loadMyGroup();
  }, [loadMyGroup]);

  const anyFeatureEnabled = matching1v1Enabled || groupEnabled || mixedGroupEnabled;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-60px)] p-4 bg-muted/30 relative">
      <div className="pointer-events-none absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-primary/[0.06] blur-[100px]" />

      {isGloballyPaused && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <PauseCircle className="w-16 h-16 text-white mb-4" />
          <p className="text-xl font-semibold text-white">
            {globalPauseMessage || t('globalPause.paused')}
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto relative space-y-4">
        {/* ── 小组讨论：身份颜色卡片 ── */}
        {groupEnabled && (
          <IdentitySection
            t={t}
            state={identityState}
            onSelect={setIdentity}
          />
        )}

        {/* ── 1v1 匹配 ── */}
        {matching1v1Enabled && (
          <div className="bg-card rounded-2xl border border-primary/20 p-5 space-y-4">
            <h3 className="font-semibold">{t('userFlow.matchingOpen')}</h3>

            {matchingState.phase === 'ready' && (
              <button
                onClick={goReady}
                className="w-full py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity touch-feedback"
              >
                {t('userFlow.joinMatching')}
              </button>
            )}

            {matchingState.phase === 'matching' && (
              <div className="text-center space-y-2">
                <div className="animate-pulse text-primary">
                  <Users className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-sm text-muted-foreground">{t('userFlow.waitingForMatch')}</p>
                <p className="text-xs text-muted-foreground">
                  {matchingState.readyCount} {t('userFlow.peopleWaiting')}
                </p>
                <button
                  onClick={cancelReady}
                  className="mt-2 px-4 py-1.5 rounded-full text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
                >
                  {t('userFlow.cancelReady')}
                </button>
              </div>
            )}

            {matchingState.phase === 'chatting' && matchingState.partner && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  {matchingState.partner.profile?.avatar_url ? (
                    <img
                      src={matchingState.partner.profile.avatar_url}
                      alt=""
                      className="w-16 h-16 mx-auto rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                      {(matchingState.partner.profile?.nickname ?? '?')[0]}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {matchingState.partner.profile?.nickname || t('userFlow.anonymous')}
                  </p>
                </div>
                <button
                  onClick={finishChat}
                  className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity touch-feedback"
                >
                  {t('userFlow.finishRound')}
                </button>
              </div>
            )}

            {matchingState.phase === 'left' && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">{t('userFlow.leftHint')}</p>
                <button
                  onClick={rejoin}
                  className="px-6 py-2 rounded-full border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                >
                  {t('userFlow.rejoin')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 小组讨论（混合分组） ── */}
        {mixedGroupEnabled && (
          <>
            {groupLoading && (
              <div className="animate-pulse h-40 bg-muted rounded-2xl" />
            )}

            {!groupLoading && myGroup && (() => {
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
            })()}

            {!groupLoading && !myGroup && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                    <Users className="w-6 h-6 text-primary/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">{t('userFlow.waitingForGroup')}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 无功能开放 ── */}
        {!anyFeatureEnabled && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Users className="w-8 h-8 text-primary/40" />
            </div>
            <p className="text-muted-foreground font-medium">{t('userFlow.noActiveFlow')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('userFlow.waitingHint')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 身份选择区块 ──

const IDENTITY_COLORS: Record<IdentityType, { bg: string; border: string; text: string; dot: string }> = {
  engineering: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    dot: 'bg-blue-500',
  },
  non_engineering: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

function IdentitySection({
  t,
  state,
  onSelect,
}: {
  t: (key: string) => string;
  state: ReturnType<typeof import('@/hooks/useGroupIdentity').useGroupIdentity>['state'];
  onSelect: (id: IdentityType) => void;
}) {
  const selected = state.myIdentity;
  const selectedColors = selected ? IDENTITY_COLORS[selected] : null;

  const cards: { type: IdentityType; label: string; icon: typeof Code }[] = [
    { type: 'engineering', label: t('groupIdentity.engineering'), icon: Code },
    { type: 'non_engineering', label: t('groupIdentity.nonEngineering'), icon: Briefcase },
  ];

  // After selection: show a large color beacon
  if (selected && selectedColors) {
    const Icon = selected === 'engineering' ? Code : Briefcase;
    const label = selected === 'engineering'
      ? t('groupIdentity.engineering')
      : t('groupIdentity.nonEngineering');

    return (
      <div
        className={`rounded-2xl border-2 ${selectedColors.border} ${selectedColors.bg} p-8 text-center space-y-4 transition-all duration-500`}
      >
        <div className={`w-20 h-20 mx-auto rounded-full ${selectedColors.bg} flex items-center justify-center`}>
          <Icon className={`w-10 h-10 ${selectedColors.text}`} />
        </div>
        <p className={`text-xl font-bold ${selectedColors.text}`}>{label}</p>
        <button
          onClick={() => onSelect(selected === 'engineering' ? 'non_engineering' : 'engineering')}
          className="mt-2 px-5 py-2 rounded-full text-sm font-medium text-foreground border border-border bg-white shadow-sm hover:shadow-md transition-all"
        >
          {t('groupIdentity.switchIdentity')}
        </button>
      </div>
    );
  }

  // Before selection: show choice cards
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="space-y-1">
        <h3 className="font-semibold">{t('groupIdentity.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('groupIdentity.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ type, label, icon: Icon }) => {
          const colors = IDENTITY_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-current transition-all touch-feedback hover:shadow-sm"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.bg}`}>
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
