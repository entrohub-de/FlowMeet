import { createServerClient } from '@/lib/supabase/server';
import { withApiHandler, apiSuccess, apiError, requireParam } from '@/lib/api-helpers';

/** POST /api/v1/events/:eventId/checkin — check in a participant */
export const POST = withApiHandler(async (request, { params }, _keyInfo) => {
  const { eventId } = await params;
  const body = await request.json();
  const userId = requireParam(body, 'userId');

  const supabase = createServerClient();

  // Check if user is signed up
  const { data: signup, error: signupError } = await supabase
    .from('evt_signups')
    .select('signup_id, checked_in')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (signupError) throw signupError;
  if (!signup) return apiError('User not signed up for this event', 'NOT_SIGNED_UP', 404);
  if (signup.checked_in) return apiError('User already checked in', 'ALREADY_CHECKED_IN', 409);

  // Perform check-in
  const { error: updateError } = await supabase
    .from('evt_signups')
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (updateError) throw updateError;

  return apiSuccess({ checkedIn: true });
});
