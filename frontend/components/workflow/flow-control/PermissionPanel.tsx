'use client';

import { Users, UserCheck, Shuffle, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';
import type { AutoMatchingStats } from '@/hooks/useAutoMatching';
import type { ActiveFlowPermissions } from '@/types/domain';

interface PermissionPanelProps {
  permissions: ActiveFlowPermissions;
  onTogglePermission: (key: 'matching_1v1_enabled' | 'matching_group_enabled' | 'matching_mixed_group_enabled') => void;
  autoMatchingStats: AutoMatchingStats;
  autoMatchingError: string | null;
  onTriggerManualRound: () => void;
  mixedGroupGenerating?: boolean;
  onlineCount: number;
  conversationCount: number;
  idleCount: number;
}

export default function PermissionPanel({
  permissions,
  onTogglePermission,
  autoMatchingStats,
  autoMatchingError,
  onTriggerManualRound,
  mixedGroupGenerating,
  onlineCount,
  conversationCount,
  idleCount,
}: PermissionPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* 权限控制区 */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t('hostFlow.permissionControl') || '权限控制'}
        </h3>

        {/* 1v1 匹配开关 */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              permissions.matching_1v1_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('hostFlow.matching1v1') || '1v1 匹配'}</p>
              <p className="text-xs text-muted-foreground">
                {permissions.matching_1v1_enabled
                  ? (t('hostFlow.matchingActive') || '用户可以自主参与匹配')
                  : (t('hostFlow.matchingInactive') || '匹配未开放')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onTogglePermission('matching_1v1_enabled')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              permissions.matching_1v1_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              permissions.matching_1v1_enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* 分行业讨论开关 */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              permissions.matching_group_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('hostFlow.matchingGroup') || '小组讨论'}</p>
              <p className="text-xs text-muted-foreground">
                {permissions.matching_group_enabled
                  ? (t('hostFlow.groupActive') || '分组功能已开放')
                  : (t('hostFlow.groupInactive') || '分组未开放')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onTogglePermission('matching_group_enabled')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              permissions.matching_group_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              permissions.matching_group_enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* 小组讨论开关（混合分组） */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              permissions.matching_mixed_group_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Shuffle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{t('hostFlow.matchingMixedGroup') || '小组讨论'}</p>
              <p className="text-xs text-muted-foreground">
                {permissions.matching_mixed_group_enabled
                  ? (t('hostFlow.mixedGroupActive') || '混合分组已开放')
                  : (t('hostFlow.mixedGroupInactive') || '混合分组未开放')}
              </p>
            </div>
          </div>
          <button
            onClick={() => onTogglePermission('matching_mixed_group_enabled')}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              permissions.matching_mixed_group_enabled ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              permissions.matching_mixed_group_enabled ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* 混合分组状态 */}
        {permissions.matching_mixed_group_enabled && mixedGroupGenerating && (
          <div className="pl-11">
            <p className="text-xs text-muted-foreground animate-pulse">
              {t('common.loading') || '分组中...'}
            </p>
          </div>
        )}
      </div>

      {/* 实时看板 */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {autoMatchingStats.connected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${autoMatchingStats.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          </span>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t('hostFlow.liveStats') || '实时看板'}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-primary">{onlineCount}</p>
            <p className="text-xs text-muted-foreground">{t('hostFlow.online') || '在线'}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-green-600">{conversationCount}</p>
            <p className="text-xs text-muted-foreground">{t('hostFlow.inConversation') || '对话中'}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/50">
            <p className="text-2xl font-bold text-muted-foreground">{idleCount}</p>
            <p className="text-xs text-muted-foreground">{t('hostFlow.idle') || '空闲'}</p>
          </div>
        </div>

        {/* 自动匹配引擎状态 */}
        {permissions.matching_1v1_enabled && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {autoMatchingStats.isRunning ? (
                  <Zap className="w-4 h-4 text-primary animate-pulse" />
                ) : (
                  <ZapOff className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {t('hostFlow.autoMatchEngine') || '自动匹配引擎'}
                </span>
              </div>
              <button
                onClick={onTriggerManualRound}
                className="text-xs px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('hostFlow.triggerNow') || '立即匹配'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-semibold">{autoMatchingStats.readyCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('hostFlow.readyCount') || '等待中'}</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{autoMatchingStats.totalRounds}</p>
                <p className="text-[10px] text-muted-foreground">{t('hostFlow.totalRounds') || '总轮次'}</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{autoMatchingStats.totalPaired}</p>
                <p className="text-[10px] text-muted-foreground">{t('hostFlow.totalPaired') || '总配对'}</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{autoMatchingStats.avgScore}</p>
                <p className="text-[10px] text-muted-foreground">{t('hostFlow.avgScore') || '平均分'}</p>
              </div>
            </div>

            {autoMatchingError && (
              <div className="flex items-center gap-2 text-destructive text-xs">
                <AlertCircle className="w-3 h-3" />
                <span>{autoMatchingError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
