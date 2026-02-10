import { supabase } from '../supabase/client';
import type { Group } from '@/types/domain';

/**
 * 获取活动的所有小组
 */
export async function getEventGroups(eventId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('evt_groups')
    .select('*')
    .eq('event_id', eventId)
    .order('name');

  if (error) {
    console.error('Error fetching event groups:', error);
    return [];
  }

  return data || [];
}

/**
 * 获取小组成员（包含用户资料）
 */
export async function getGroupMembers(groupId: string): Promise<any[]> {
  const { data: members, error: memberError } = await supabase
    .from('evt_group_members')
    .select('user_id, joined_at')
    .eq('group_id', groupId);

  if (memberError) {
    console.error('Error fetching group members:', memberError);
    return [];
  }

  if (!members || members.length === 0) {
    return [];
  }

  const userIds = members.map((m) => m.user_id);

  const { data: profiles } = await supabase
    .from('usr_profiles')
    .select('*')
    .in('user_id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

  return members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id),
  }));
}

/**
 * 获取用户所在的小组
 */
export async function getUserGroup(
  eventId: string,
  userId: string
): Promise<Group | null> {
  // 先获取用户的小组成员记录
  const { data: membership, error: memberError } = await supabase
    .from('evt_group_members')
    .select('group_id')
    .eq('user_id', userId)
    .limit(1)
    .single();

  if (memberError || !membership) {
    return null;
  }

  // 获取小组信息
  const { data: group, error: groupError } = await supabase
    .from('evt_groups')
    .select('*')
    .eq('group_id', membership.group_id)
    .eq('event_id', eventId)
    .single();

  if (groupError) {
    console.error('Error fetching user group:', groupError);
    return null;
  }

  return group;
}

/**
 * 自动分组算法 - 将已签到的用户平均分配到小组中
 */
export async function autoGenerateGroups(
  eventId: string,
  groupSize: number = 6
): Promise<boolean> {
  try {
    // 1. 获取活动的所有 session
    const { data: sessions, error: sessionError } = await supabase
      .from('evt_sessions')
      .select('session_id')
      .eq('event_id', eventId);

    if (sessionError || !sessions || sessions.length === 0) {
      console.error('Error fetching sessions:', sessionError);
      return false;
    }

    const sessionIds = sessions.map((s) => s.session_id);

    // 2. 获取已签到的用户
    const { data: assignments, error: assignmentError } = await supabase
      .from('evt_assignments')
      .select('user_id')
      .in('session_id', sessionIds)
      .eq('checked_in', true);

    if (assignmentError) {
      console.error('Error fetching checked-in users:', assignmentError);
      return false;
    }

    const userIds = [...new Set(assignments?.map((a) => a.user_id) || [])];

    if (userIds.length === 0) {
      console.log('No checked-in users to group');
      return true;
    }

    // 3. 清除现有小组（重新分组）
    const { error: deleteGroupsError } = await supabase
      .from('evt_groups')
      .delete()
      .eq('event_id', eventId);

    if (deleteGroupsError) {
      console.error('Error deleting existing groups:', deleteGroupsError);
      return false;
    }

    // 4. 计算需要的小组数量
    const numGroups = Math.ceil(userIds.length / groupSize);

    // 5. 创建小组
    const groups = [];
    for (let i = 0; i < numGroups; i++) {
      groups.push({
        event_id: eventId,
        name: `第 ${i + 1} 组`,
        max_size: groupSize,
      });
    }

    const { data: createdGroups, error: createError } = await supabase
      .from('evt_groups')
      .insert(groups)
      .select();

    if (createError || !createdGroups) {
      console.error('Error creating groups:', createError);
      return false;
    }

    // 6. 将用户随机分配到小组
    const shuffledUsers = [...userIds].sort(() => Math.random() - 0.5);
    const groupMembers: { group_id: string; user_id: string }[] = [];

    shuffledUsers.forEach((userId, index) => {
      const groupIndex = index % numGroups;
      groupMembers.push({
        group_id: createdGroups[groupIndex].group_id,
        user_id: userId,
      });
    });

    const { error: membersError } = await supabase
      .from('evt_group_members')
      .insert(groupMembers);

    if (membersError) {
      console.error('Error adding group members:', membersError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in autoGenerateGroups:', error);
    return false;
  }
}

/**
 * 获取小组的完整信息（包括成员）
 */
export async function getGroupsWithMembers(eventId: string): Promise<any[]> {
  const groups = await getEventGroups(eventId);

  const groupsWithMembers = await Promise.all(
    groups.map(async (group) => {
      const members = await getGroupMembers(group.group_id);
      return {
        ...group,
        members,
        currentSize: members.length,
      };
    })
  );

  return groupsWithMembers;
}
