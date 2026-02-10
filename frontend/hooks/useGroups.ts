import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  getGroupsWithMembers,
  getUserGroup,
  autoGenerateGroups,
} from '@/lib/api/groups';
import { getEvents } from '@/lib/api/events';
import type { Event, Group } from '@/types/domain';

export function useGroups() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [groups, setGroups] = useState<any[]>([]);
  const [userGroup, setUserGroup] = useState<Group | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载用户和活动列表
  useEffect(() => {
    const loadData = async () => {
      try {
        // 获取当前用户
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }

        // 加载活动
        const eventsData = await getEvents();
        setEvents(eventsData);

        // 默认选择第一个活动
        if (eventsData.length > 0 && !selectedEventId) {
          setSelectedEventId(eventsData[0].event_id);
        }
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events');
      }
    };

    loadData();
  }, []);

  // 加载小组数据
  useEffect(() => {
    if (!selectedEventId || !userId) {
      setLoading(false);
      return;
    }

    const loadGroups = async () => {
      setLoading(true);
      setError(null);

      try {
        // 加载所有小组及成员
        const groupsData = await getGroupsWithMembers(selectedEventId);
        setGroups(groupsData);

        // 加载用户所在的小组
        const userGroupData = await getUserGroup(selectedEventId, userId);
        setUserGroup(userGroupData);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [selectedEventId, userId]);

  // 生成小组
  const generateGroups = async (groupSize: number = 6): Promise<boolean> => {
    if (!selectedEventId) return false;

    setLoading(true);
    setError(null);

    try {
      const success = await autoGenerateGroups(selectedEventId, groupSize);

      if (success) {
        // 重新加载小组数据
        const groupsData = await getGroupsWithMembers(selectedEventId);
        setGroups(groupsData);

        if (userId) {
          const userGroupData = await getUserGroup(selectedEventId, userId);
          setUserGroup(userGroupData);
        }
      }

      return success;
    } catch (err) {
      console.error('Error generating groups:', err);
      setError('Failed to generate groups');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    events,
    selectedEventId,
    setSelectedEventId,
    groups,
    userGroup,
    userId,
    loading,
    error,
    generateGroups,
  };
}
