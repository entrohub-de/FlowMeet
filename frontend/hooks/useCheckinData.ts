import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getEvents } from '@/lib/api/events';
import { getAllUserCheckinStatuses } from '@/lib/api/checkin';
import { getUserSignups } from '@/lib/api/signup';
import { Event } from '@/types/domain';

export function useCheckinData() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedInEvents, setCheckedInEvents] = useState<Map<string, boolean>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // 加载签到状态的函数（可复用）
  const loadCheckinStatuses = async (currentUserId: string) => {
    try {
      const statusMap = await getAllUserCheckinStatuses(currentUserId);
      setCheckedInEvents(statusMap);
    } catch (error) {
      console.error('Failed to load checkin status:', error);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);

          // 加载所有活动
          const allEvents = await getEvents();

          // 加载用户报名的活动
          const signupMap = await getUserSignups(user.id);

          // 只显示已报名的活动
          const signedUpEvents = allEvents.filter((event) =>
            signupMap.has(event.event_id)
          );
          setEvents(signedUpEvents);

          // 加载签到状态
          await loadCheckinStatuses(user.id);

          // 订阅 evt_signups 表的实时更新
          const channel = supabase
            .channel('checkin-updates')
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'evt_signups',
                filter: `user_id=eq.${user.id}`,
              },
              (payload) => {
                console.log('[Realtime] 签到状态更新:', payload);
                // 重新加载签到状态
                loadCheckinStatuses(user.id);
              }
            )
            .subscribe();

          // 清理订阅
          return () => {
            channel.unsubscribe();
          };
        } else {
          // 未登录用户不显示任何活动
          setEvents([]);
        }
      } catch (error) {
        console.error('Failed to load events:', error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return {
    events,
    loading,
    checkedInEvents,
    userId,
    error,
  };
}
