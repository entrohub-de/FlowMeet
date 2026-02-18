import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess } from '@/lib/api-helpers';

/** GET /api/v1/workflow-templates — list all workflow templates */
export const GET = withApiHandler(async () => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('workflow_templates')
    .select('template_id, event_id, name, steps, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return apiSuccess(data || []);
});
