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
          try {
            const statusMap = await getAllUserCheckinStatuses(user.id);
            setCheckedInEvents(statusMap);
          } catch (error) {
            console.error('Failed to load checkin status:', error);
          }
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
