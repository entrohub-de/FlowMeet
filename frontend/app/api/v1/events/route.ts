import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError } from '@/lib/api-helpers';

const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

/** GET /api/v1/events — list all events */
export const GET = withApiHandler(async () => {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .order('start_time', { ascending: true });

  if (error) throw error;
  return apiSuccess(data || []);
});

/** POST /api/v1/events — create an event */
export const POST = withApiHandler(async (request) => {
  const body = await request.json();
  const { name, description, start_time, end_time, venue_id, cover_image, created_by } = body;

  if (!name || !start_time || !end_time) {
    return apiError('Missing required fields: name, start_time, end_time', 'VALIDATION_ERROR');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('evt_events')
    .insert([{ name, description, start_time, end_time, venue_id, cover_image, created_by }])
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return apiSuccess(data, 201);
});
