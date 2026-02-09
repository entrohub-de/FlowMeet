import { supabase } from '@/lib/supabase/client';
import type { Expectation } from '@/types/domain';

/**
 * 获取某个活动的所有期待
 */
export async function getEventExpectations(eventId: string): Promise<Expectation[]> {
  const { data, error } = await supabase
    .from('evt_expectations')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 获取用户在某个活动的期待
 */
export async function getUserExpectation(
  eventId: string,
  userId: string
): Promise<Expectation | null> {
  const { data, error } = await supabase
    .from('evt_expectations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw error;
  }
  return data;
}

/**
 * 创建或更新用户的活动期待
 */
export async function upsertExpectation(
  eventId: string,
  userId: string,
  content: string
): Promise<Expectation> {
  const { data, error } = await supabase
    .from('evt_expectations')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        content,
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
 * 删除用户的活动期待
 */
export async function deleteExpectation(expectationId: string): Promise<void> {
  const { error } = await supabase
    .from('evt_expectations')
    .delete()
    .eq('expectation_id', expectationId);

  if (error) throw error;
}
