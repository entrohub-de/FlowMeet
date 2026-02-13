import { supabase } from '@/lib/supabase/client';
import type { WorkflowStepConfig } from '@/features/host-console/workflowModules';

export interface WorkflowTemplateRecord {
  template_id: string;
  event_id: string;
  name: string;
  steps: WorkflowStepConfig[];
  created_at: string;
  updated_at: string;
}

export async function getWorkflowTemplates(eventId: string): Promise<WorkflowTemplateRecord[]> {
  const { data, error } = await supabase
    .from('workflow_templates')
    .select('template_id, event_id, name, steps, created_at, updated_at')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as WorkflowTemplateRecord[]) || [];
}

export async function createWorkflowTemplate(
  eventId: string,
  name: string,
  steps: WorkflowStepConfig[]
): Promise<WorkflowTemplateRecord> {
  const { data, error } = await supabase
    .from('workflow_templates')
    .insert([{ event_id: eventId, name, steps }])
    .select('template_id, event_id, name, steps, created_at, updated_at')
    .single();

  if (error) throw error;
  return data as WorkflowTemplateRecord;
}

export async function renameWorkflowTemplate(templateId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_templates')
    .update({ name })
    .eq('template_id', templateId);

  if (error) throw error;
}

export async function updateWorkflowTemplateSteps(
  templateId: string,
  steps: WorkflowStepConfig[]
): Promise<void> {
  const { error } = await supabase
    .from('workflow_templates')
    .update({ steps })
    .eq('template_id', templateId);

  if (error) throw error;
}

export async function deleteWorkflowTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('workflow_templates')
    .delete()
    .eq('template_id', templateId);

  if (error) throw error;
}
