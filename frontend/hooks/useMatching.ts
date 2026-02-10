import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  getUserMatches,
  getMatchRecommendations,
  getAvailableUsersWithPreferences,
  getCurrentUserWithPreferences,
  requestMatch as apiRequestMatch,
  acceptMatch as apiAcceptMatch,
  declineMatch as apiDeclineMatch,
  completeMatch as apiCompleteMatch,
} from '@/lib/api/matching';
import {
  generateMatchRecommendations,
  type MatchScore,
} from '@/lib/api/matching-algorithm';
import { Event, Match } from '@/types/domain';

export function useMatching() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<MatchScore[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载用户已签到的活动列表
  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // 获取用户已签到的活动
        // 1. 获取用户已签到的session
        const { data: assignments, error: assignmentError } = await supabase
          .from('evt_assignments')
          .select('session_id')
          .eq('user_id', user.id)
          .eq('checked_in', true);

        if (assignmentError) {
          throw assignmentError;
        }

        if (!assignments || assignments.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const sessionIds = assignments.map((a) => a.session_id);

        // 2. 通过session获取event
        const { data: sessions, error: sessionError } = await supabase
          .from('evt_sessions')
          .select('event_id, event:evt_events(*)')
          .in('session_id', sessionIds);

        if (sessionError) {
          throw sessionError;
        }

        // 3. 去重并排序活动列表
        const eventsMap = new Map();
        sessions?.forEach((s: any) => {
          if (s.event) {
            eventsMap.set(s.event.event_id, s.event);
          }
        });

        const eventsData = Array.from(eventsMap.values());

        setEvents(eventsData);

        // 自动选择第一个活动
        if (eventsData.length > 0) {
          setSelectedEventId(eventsData[0].event_id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 加载选中活动的配对数据和推荐
  useEffect(() => {
    async function loadMatchingData() {
      if (!userId || !selectedEventId) return;

      try {
        // 获取当前用户的配对记录（如果表不存在则跳过）
        try {
          const matchesData = await getUserMatches(selectedEventId, userId);
          setMatches(matchesData);
        } catch (e) {
          console.log('Matches table not available yet');
          setMatches([]);
        }

        // 尝试调用后端 Edge Function，如果失败则降级到前端实现
        try {
          const recommendations = await getMatchRecommendations(selectedEventId);
          if (recommendations.length > 0) {
            setRecommendedUsers(recommendations);
            return;
          }
        } catch (e) {
          console.log('Edge Function not available, using client-side matching');
        }

        // 降级：使用前端匹配算法
        const currentUser = await getCurrentUserWithPreferences(userId);
        const availableUsers = await getAvailableUsersWithPreferences(
          selectedEventId,
          userId
        );

        if (currentUser && availableUsers.length > 0) {
          const recommendations = generateMatchRecommendations(
            currentUser,
            availableUsers
          );
          setRecommendedUsers(recommendations);
        } else {
          setRecommendedUsers([]);
        }
      } catch (error) {
        console.error('Failed to load matching data:', error);
      }
    }
    loadMatchingData();
  }, [selectedEventId, userId]);

  // 发起配对请求
  const requestMatch = async (targetUserId: string): Promise<boolean> => {
    if (!userId || !selectedEventId) return false;

    try {
      const success = await apiRequestMatch(selectedEventId, userId, targetUserId);
      if (success) {
        // 重新加载数据
        try {
          const matchesData = await getUserMatches(selectedEventId, userId);
          setMatches(matchesData);
        } catch (e) {
          console.log('Matches table not available yet');
        }

        // 更新推荐列表（移除已配对的用户）
        setRecommendedUsers((prev) => prev.filter((u) => u.userId !== targetUserId));
      }
      return success;
    } catch (error) {
      console.error('Failed to request match:', error);
      return false;
    }
  };

  // 接受配对
  const acceptMatch = async (matchId: string): Promise<boolean> => {
    try {
      const success = await apiAcceptMatch(matchId);
      if (success && userId && selectedEventId) {
        try {
          const matchesData = await getUserMatches(selectedEventId, userId);
          setMatches(matchesData);
        } catch (e) {
          console.log('Matches table not available yet');
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to accept match:', error);
      return false;
    }
  };

  // 拒绝配对
  const declineMatch = async (matchId: string): Promise<boolean> => {
    try {
      const success = await apiDeclineMatch(matchId);
      if (success && userId && selectedEventId) {
        try {
          const matchesData = await getUserMatches(selectedEventId, userId);
          setMatches(matchesData);
        } catch (e) {
          console.log('Matches table not available yet');
        }

        // 重新加载推荐
        try {
          const recommendations = await getMatchRecommendations(selectedEventId);
          setRecommendedUsers(recommendations);
        } catch (e) {
          // 降级到前端实现
          const currentUser = await getCurrentUserWithPreferences(userId);
          const availableUsers = await getAvailableUsersWithPreferences(
            selectedEventId,
            userId
          );
          if (currentUser && availableUsers.length > 0) {
            const recommendations = generateMatchRecommendations(
              currentUser,
              availableUsers
            );
            setRecommendedUsers(recommendations);
          }
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to decline match:', error);
      return false;
    }
  };

  // 完成配对
  const completeMatch = async (matchId: string): Promise<boolean> => {
    try {
      const success = await apiCompleteMatch(matchId);
      if (success && userId && selectedEventId) {
        try {
          const matchesData = await getUserMatches(selectedEventId, userId);
          setMatches(matchesData);
        } catch (e) {
          console.log('Matches table not available yet');
        }
      }
      return success;
    } catch (error) {
      console.error('Failed to complete match:', error);
      return false;
    }
  };

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    matches,
    recommendedUsers,
    userId,
    loading,
    error,
    requestMatch,
    acceptMatch,
    declineMatch,
    completeMatch,
  };
}
