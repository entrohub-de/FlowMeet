import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError } from '@/lib/api-helpers';

const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

/** GET /api/v1/events/:eventId — get event details */
export const GET = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('evt_events')
    .select(EVENT_SELECT)
    .eq('event_id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return apiError('Event not found', 'NOT_FOUND', 404);
    throw error;
  }
  return apiSuccess(data);
});

/** PATCH /api/v1/events/:eventId — update event */
export const PATCH = withApiHandler(async (request, { params }) => {
  const { eventId } = await params;
  const body = await request.json();

  const allowedFields = ['name', 'description', 'start_time', 'end_time', 'venue_id', 'cover_image', 'status'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No valid fields to update', 'VALIDATION_ERROR');
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('evt_events')
    .update(updates)
    .eq('event_id', eventId)
    .select(EVENT_SELECT)
    .single();

  if (error) throw error;
  return apiSuccess(data);
});

/** DELETE /api/v1/events/:eventId — delete event */
export const DELETE = withApiHandler(async (_request, { params }) => {
  const { eventId } = await params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('evt_events')
    .delete()
    .eq('event_id', eventId);

  if (error) throw error;
  return apiSuccess({ deleted: true });
});
