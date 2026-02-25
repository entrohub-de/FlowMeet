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
  const [myGroup, setMyGroup] = useState<{ name: string; members: Array<{ user_id: string; profile?: { nickname: string | null } }> } | null>(null);
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
        setMyGroup({ name: group.name, members });
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
                  className="text-xs text-muted-foreground underline"
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
                  <p className="text-lg font-semibold">{t('userFlow.chatting')}</p>
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
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">{t('userFlow.mixedGroupTitle')}</h3>
            </div>

            {groupLoading && (
              <div className="animate-pulse h-20 bg-muted rounded-xl" />
            )}

            {!groupLoading && myGroup && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-primary">{myGroup.name}</p>
                <div className="space-y-2">
                  {myGroup.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {member.profile?.nickname?.[0] || '?'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.profile?.nickname || t('userFlow.anonymous')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!groupLoading && !myGroup && (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Users className="w-6 h-6 text-primary/40" />
                </div>
                <p className="text-sm text-muted-foreground">{t('userFlow.waitingForGroup')}</p>
              </div>
            )}
          </div>
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
  const cards: { type: IdentityType; label: string; icon: typeof Code; count: number }[] = [
    { type: 'engineering', label: t('groupIdentity.engineering'), icon: Code, count: state.engineeringCount },
    { type: 'non_engineering', label: t('groupIdentity.nonEngineering'), icon: Briefcase, count: state.nonEngineeringCount },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-semibold text-sm">{t('groupIdentity.title')}</h3>

      {/* 身份选择卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(({ type, label, icon: Icon, count }) => {
          const selected = state.myIdentity === type;
          const colors = IDENTITY_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-feedback ${
                selected
                  ? `${colors.bg} ${colors.border} shadow-sm`
                  : 'border-border bg-muted/30 opacity-60 hover:opacity-80'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selected ? colors.bg : 'bg-muted'
              }`}>
                <Icon className={`w-5 h-5 ${selected ? colors.text : 'text-muted-foreground'}`} />
              </div>
              <span className={`text-sm font-medium ${selected ? colors.text : 'text-muted-foreground'}`}>
                {label}
              </span>
              <span className={`text-xs ${selected ? colors.text : 'text-muted-foreground'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 参与者列表 */}
      {state.participants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {t('groupIdentity.participants')} ({state.totalCount})
          </p>
          <div className="flex flex-wrap gap-2">
            {state.participants.map((p) => {
              const colors = p.identity ? IDENTITY_COLORS[p.identity] : null;
              return (
                <span
                  key={p.userId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 text-xs"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${colors?.dot ?? 'bg-gray-300'}`} />
                  <span className="truncate max-w-[80px]">
                    {p.nickname || '?'}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
