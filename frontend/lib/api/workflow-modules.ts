import { supabase } from '@/lib/supabase/client';
import type { ModuleDefinition, WorkflowModule, WorkflowModuleCategory } from '@/features/host-console/workflowModules';

const COLUMNS = 'module_id, module_key, name, description, module_type, default_duration_minutes, definition';

interface WorkflowModuleRow {
  module_id: string;
  module_key: string;
  name: string;
  description: string;
  module_type: string;
  default_duration_minutes: number;
  definition: Record<string, unknown> | null;
}

function rowToModule(row: WorkflowModuleRow): WorkflowModule {
  const def = (row.definition ?? {}) as ModuleDefinition;
  return {
    id: row.module_key,
    title: row.name,
    description: row.description ?? '',
    durationMinutes: row.default_duration_minutes,
    category: row.module_type as WorkflowModuleCategory,
    definition: {
      pairingMode: def.pairingMode,
      enableTopics: def.enableTopics,
    },
  };
}

/** Fetch all visible modules: system modules (created_by IS NULL) + current user's custom modules. */
export async function getAllWorkflowModules(): Promise<WorkflowModule[]> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: systemData, error: systemError } = await supabase
    .from('workflow_modules')
    .select(COLUMNS)
    .is('created_by', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (systemError) throw systemError;
  const systemModules = (systemData as WorkflowModuleRow[]).map(rowToModule);

  if (!user) return systemModules;

  const { data: customData, error: customError } = await supabase
    .from('workflow_modules')
    .select(COLUMNS)
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (customError) throw customError;
  const customModules = (customData as WorkflowModuleRow[]).map(rowToModule);

  return [...systemModules, ...customModules];
}

export async function createCustomWorkflowModule(
  module: Omit<WorkflowModule, 'id'>
): Promise<WorkflowModule> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User is not authenticated');

  const moduleKey = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('workflow_modules')
    .insert([{
      created_by: user.id,
      module_key: moduleKey,
      name: module.title,
      description: module.description,
      module_type: module.category,
      default_duration_minutes: module.durationMinutes,
      definition: module.definition,
    }])
    .select(COLUMNS)
    .single();

  if (error) throw error;
  return rowToModule(data as WorkflowModuleRow);
}

export async function updateWorkflowModule(
  moduleKey: string,
  updates: Partial<Omit<WorkflowModule, 'id'>>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.name = updates.title;
  if (updates.description !== undefined) row.description = updates.description;
  if (updates.category !== undefined) row.module_type = updates.category;
  if (updates.durationMinutes !== undefined) row.default_duration_minutes = updates.durationMinutes;
  if (updates.definition !== undefined) row.definition = updates.definition;

  const { error } = await supabase
    .from('workflow_modules')
    .update(row)
    .eq('module_key', moduleKey);

  if (error) throw error;
}

export async function deleteWorkflowModule(moduleKey: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_modules')
    .delete()
    .eq('module_key', moduleKey);

  if (error) throw error;
}
