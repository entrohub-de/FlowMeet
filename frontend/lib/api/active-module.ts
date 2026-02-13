import { supabase } from '@/lib/supabase/client';
import type { ActiveModule } from '@/types/domain';

/**
 * 创建一个新的模块执行记录（每次 host 触发匹配 = 一个新记录）
 * 自动计算 round_number（同一 event + step 下递增）
 */
export async function createActiveModule(
  eventId: string,
  stepId: string,
  moduleType: string,
  readyCount: number,
  startedBy: string
): Promise<ActiveModule> {
  // 计算当前步骤的轮次号
  const { count } = await supabase
    .from('session_active_module')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('step_id', stepId);

  const roundNumber = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from('session_active_module')
    .insert({
      event_id: eventId,
      step_id: stepId,
      module_type: moduleType,
      status: 'active',
      round_number: roundNumber,
      ready_count: readyCount,
      started_by: startedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 匹配完成后更新模块执行记录的统计数据
 */
export async function completeActiveModule(
  moduleId: string,
  stats: {
    paired_count: number;
    unpaired_user_ids?: string[];
    avg_match_score?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from('session_active_module')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      paired_count: stats.paired_count,
      unpaired_user_ids: stats.unpaired_user_ids ?? [],
      avg_match_score: stats.avg_match_score ?? null,
      metadata: stats.metadata ?? {},
    })
    .eq('id', moduleId);

  if (error) throw error;
}

/**
 * 获取某个活动某个步骤的所有模块执行记录
 */
export async function getActiveModules(
  eventId: string,
  stepId?: string
): Promise<ActiveModule[]> {
  let query = supabase
    .from('session_active_module')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (stepId) {
    query = query.eq('step_id', stepId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
