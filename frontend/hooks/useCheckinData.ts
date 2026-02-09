import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getEvents } from '@/lib/api/events';
import { getAllUserCheckinStatuses } from '@/lib/api/checkin';
import { Event } from '@/types/domain';

export function useCheckinData() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedInEvents, setCheckedInEvents] = useState<Map<string, boolean>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        // 加载活动数据（不管是否登录都加载）
        const eventsData = await getEvents();
        setEvents(eventsData);

        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();

        // 如果用户已登录，加载签到状态
        if (user) {
          setUserId(user.id);
          try {
            const statusMap = await getAllUserCheckinStatuses(user.id);
            setCheckedInEvents(statusMap);
          } catch (error) {
            console.error('Failed to load checkin status:', error);
            // 即使加载签到状态失败，也继续显示活动
          }
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
