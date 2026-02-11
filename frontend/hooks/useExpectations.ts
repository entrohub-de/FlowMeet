import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getUserSignedUpEvents } from '@/lib/api/signup';
import {
  getEventExpectations,
  getUserExpectation,
  upsertExpectation,
} from '@/lib/api/expectations';
import { Event, Expectation } from '@/types/domain';

export function useExpectations() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [myExpectation, setMyExpectation] = useState<string>('');
  const [allExpectations, setAllExpectations] = useState<Expectation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载活动列表和用户信息
  useEffect(() => {
    async function loadData() {
      try {
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          // 只获取用户已报名的活动
          const eventsData = await getUserSignedUpEvents(user.id);
          setEvents(eventsData);

          if (eventsData.length > 0) {
            setSelectedEventId(eventsData[0].event_id);
          }
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

  // 加载选中活动的期待
  useEffect(() => {
    async function loadExpectations() {
      if (!selectedEventId) return;

      try {
        // 加载所有期待
        const expectations = await getEventExpectations(selectedEventId);
        setAllExpectations(expectations);

        // 加载用户自己的期待
        if (userId) {
          const userExp = await getUserExpectation(selectedEventId, userId);
          setMyExpectation(userExp?.content || '');
        }
      } catch (error) {
        console.error('Failed to load expectations:', error);
      }
    }
    loadExpectations();
  }, [selectedEventId, userId]);

  // 提交期待
  const submitExpectation = async (content: string): Promise<boolean> => {
    if (!userId || !selectedEventId || !content.trim()) return false;

    setSubmitting(true);
    try {
      await upsertExpectation(selectedEventId, userId, content.trim());

      // 重新加载期待列表
      const expectations = await getEventExpectations(selectedEventId);
      setAllExpectations(expectations);
      setMyExpectation(content.trim());

      return true;
    } catch (error) {
      console.error('Failed to submit expectation:', error);
      setError(error as Error);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    myExpectation,
    setMyExpectation,
    allExpectations,
    userId,
    loading,
    submitting,
    error,
    submitExpectation,
  };
}
