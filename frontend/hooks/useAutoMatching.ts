'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  observeMatchingQueue,
  type MatchingPresenceState,
} from '@/lib/realtime/matching-queue';
import { generatePairs, persistPairs } from '@/lib/api/auto-pairing';
import { logHostAction } from '@/lib/api/host-actions';
import { createActiveModule, completeActiveModule } from '@/lib/api/active-module';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const AUTO_MATCH_INTERVAL_MS = 8_000; // 8 秒微批量间隔
const MIN_READY_FOR_MATCH = 2;        // 最少 2 人才触发

export interface AutoMatchingStats {
  totalRounds: number;
  totalPaired: number;
  avgScore: number;
  lastRoundAt: string | null;
  readyCount: number;
  totalPresent: number;
  isRunning: boolean;
}

export function useAutoMatching(eventId: string, enabled: boolean) {
  const [stats, setStats] = useState<AutoMatchingStats>({
    totalRounds: 0,
    totalPaired: 0,
    avgScore: 0,
    lastRoundAt: null,
    readyCount: 0,
    totalPresent: 0,
    isRunning: false,
  });
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyUserIdsRef = useRef<string[]>([]);
  const isMatchingRef = useRef(false);
  const allScoresRef = useRef<number[]>([]);  // 所有轮次的 scores 用于计算全场 avgScore
  const roundCountRef = useRef(0);

  // 单轮匹配执行
  const executeMatchRound = useCallback(async () => {
    if (!eventId || isMatchingRef.current) return;
    const readyIds = readyUserIdsRef.current;
    if (readyIds.length < MIN_READY_FOR_MATCH) return;

    isMatchingRef.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const hostId = session?.user?.id ?? '';

      // 创建 active module 记录
      const activeModule = await createActiveModule(
        eventId,
        'auto-matching',
        '1v1',
        readyIds.length,
        hostId
      );

      // 生成配对（复用现有算法，自动排除历史对）
      const { pairs, unpairedUserId } = await generatePairs(eventId, readyIds);

      if (pairs.length === 0) {
        isMatchingRef.current = false;
        return;
      }

      // 持久化到数据库
      const persisted = await persistPairs(pairs, eventId, activeModule.id);

      const roundAvgScore = pairs.length > 0
        ? Math.round(pairs.reduce((sum, p) => sum + p.score, 0) / pairs.length)
        : 0;

      // 完成 module 记录
      await completeActiveModule(activeModule.id, {
        paired_count: persisted.length * 2,
        unpaired_user_ids: unpairedUserId ? [unpairedUserId] : [],
        avg_match_score: roundAvgScore,
      });

      // 广播配对结果给参与者
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'match_assigned',
          payload: {
            pairs: persisted,
            unpaired: unpairedUserId ? [unpairedUserId] : undefined,
            timestamp: new Date().toISOString(),
          },
        });
      }

      // 记录审计日志
      roundCountRef.current += 1;
      logHostAction(eventId, 'auto_match_triggered', {
        readyCount: readyIds.length,
        pairedCount: persisted.length * 2,
        avgScore: roundAvgScore,
        round: roundCountRef.current,
      });

      // 更新统计
      allScoresRef.current.push(...pairs.map(p => p.score));
      const overallAvg = allScoresRef.current.length > 0
        ? Math.round(allScoresRef.current.reduce((a, b) => a + b, 0) / allScoresRef.current.length)
        : 0;

      setStats(prev => ({
        ...prev,
        totalRounds: prev.totalRounds + 1,
        totalPaired: prev.totalPaired + persisted.length * 2,
        avgScore: overallAvg,
        lastRoundAt: new Date().toISOString(),
      }));
      setError(null);
    } catch (err) {
      console.error('[AutoMatching] Round failed:', err);
      setError(err instanceof Error ? err.message : '自动匹配出错');
    } finally {
      isMatchingRef.current = false;
    }
  }, [eventId]);

  // 启动/停止自动匹配引擎
  useEffect(() => {
    if (!enabled || !eventId) {
      // 停止
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setStats(prev => ({ ...prev, isRunning: false }));
      return;
    }

    // 启动 presence 观察
    const channel = observeMatchingQueue(eventId, {
      onPresenceSync: (readyUsers: MatchingPresenceState[], allUsers: MatchingPresenceState[]) => {
        readyUserIdsRef.current = readyUsers.map(u => u.userId);
        setStats(prev => ({
          ...prev,
          readyCount: readyUsers.length,
          totalPresent: allUsers.length,
        }));
      },
    });
    channelRef.current = channel;

    // 启动定时器
    const interval = setInterval(() => {
      executeMatchRound();
    }, AUTO_MATCH_INTERVAL_MS);
    intervalRef.current = interval;

    setStats(prev => ({ ...prev, isRunning: true }));

    return () => {
      clearInterval(interval);
      intervalRef.current = null;
      channel.unsubscribe();
      channelRef.current = null;
      setStats(prev => ({ ...prev, isRunning: false }));
    };
  }, [enabled, eventId, executeMatchRound]);

  // 手动触发一轮（主持人可以随时点）
  const triggerManualRound = useCallback(() => {
    executeMatchRound();
  }, [executeMatchRound]);

  return { stats, error, triggerManualRound };
}
