import { supabase } from '@/lib/supabase/client';
import type { Expectation } from '@/types/domain';

/**
 * 获取某个活动的所有期待
 * 只返回 active 状态的期待
 */
export async function getEventExpectations(eventId: string): Promise<Expectation[]> {
  const { data, error } = await supabase
    .from('expctn_event')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 获取用户在某个活动的期待
 * 只返回 active 状态的期待
 */
export async function getUserExpectation(
  eventId: string,
  userId: string
): Promise<Expectation | null> {
  const { data, error } = await supabase
    .from('expctn_event')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * 创建或更新用户的活动期待
 * 如果用户之前删除过期待，会将状态重新设置为 active
 */
export async function upsertExpectation(
  eventId: string,
  userId: string,
  content: string
): Promise<Expectation> {
  const { data, error } = await supabase
    .from('expctn_event')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        content,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'event_id,user_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 删除用户的活动期待（软删除）
 * 不会真正删除记录，而是将 status 设置为 'deleted'
 */
export async function deleteExpectation(expectationId: string): Promise<void> {
  const { error } = await supabase
    .from('expctn_event')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    })
    .eq('expectation_id', expectationId);

  if (error) throw error;
}
