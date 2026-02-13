import { supabase } from '@/lib/supabase/client';
import type { ExpectationTemplate } from '@/types/domain';

/**
 * 获取当前用户的所有期待模板
 */
export async function getTemplates(userId: string): Promise<ExpectationTemplate[]> {
  const { data, error } = await supabase
    .from('expctn_template')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * 创建期待模板
 */
export async function addTemplate(
  userId: string,
  name: string,
  tags: string[],
  text: string
): Promise<ExpectationTemplate> {
  const { data, error } = await supabase
    .from('expctn_template')
    .insert({ user_id: userId, name, tags, text })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新期待模板
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Pick<ExpectationTemplate, 'name' | 'tags' | 'text'>>
): Promise<void> {
  const { error } = await supabase
    .from('expctn_template')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('template_id', templateId);

  if (error) throw error;
}

/**
 * 删除期待模板
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('expctn_template')
    .delete()
    .eq('template_id', templateId);

  if (error) throw error;
}
