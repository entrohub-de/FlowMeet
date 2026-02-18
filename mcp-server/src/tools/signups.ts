import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';
import { requireHostAccess, resolveUserId } from '../auth.js';

export function registerSignupTools(server: McpServer) {
  // ── Host-only ───────────────────────────────────────────────────────

  server.tool(
    'host_list_signups',
    'List all event signups with user profiles and expectations (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data: signupsData, error: signupsError } = await supabase
        .from('evt_signups')
        .select('signup_id, event_id, user_id, status, created_at, checked_in, checked_in_at')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (signupsError) {
        return { content: [{ type: 'text' as const, text: `Error: ${signupsError.message}` }] };
      }

      if (!signupsData || signupsData.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify([], null, 2) }] };
      }

      const userIds = signupsData.map(s => s.user_id);

      const [{ data: profilesData }, { data: expectationsData }] = await Promise.all([
        supabase.from('usr_profiles').select('*').in('user_id', userIds),
        supabase.from('expctn_event').select('*').eq('event_id', eventId).in('user_id', userIds).eq('status', 'active'),
      ]);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );
      const expectationsMap = new Map(
        (expectationsData || []).map(e => [e.user_id, e])
      );

      const signups = signupsData.map(signup => ({
        signup_id: signup.signup_id,
        event_id: signup.event_id,
        user_id: signup.user_id,
        status: signup.status,
        created_at: signup.created_at,
        checked_in: signup.checked_in || false,
        checked_in_at: signup.checked_in_at,
        profile: profilesMap.get(signup.user_id) ?? null,
        expectation: expectationsMap.get(signup.user_id) ?? null,
      }));

      return { content: [{ type: 'text' as const, text: JSON.stringify(signups, null, 2) }] };
    }
  );

  server.tool(
    'host_get_signup_count',
    'Get the number of active signups for an event (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { count, error } = await supabase
        .from('evt_signups')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('status', 'active');

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify({ count: count || 0 }, null, 2) }] };
    }
  );

  server.tool(
    'host_get_checkin_stats',
    'Get checkin statistics for an event (total signups vs checked in) (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data, error } = await supabase
        .from('evt_signups')
        .select('checked_in')
        .eq('event_id', eventId)
        .eq('status', 'active');

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }

      const total = data?.length ?? 0;
      const checkedIn = data?.filter(s => s.checked_in).length ?? 0;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ checkedIn, total }, null, 2),
        }],
      };
    }
  );

  // ── User-only ───────────────────────────────────────────────────────

  server.tool(
    'user_get_my_signup',
    'Get current user\'s signup status for an event',
    {
      eventId: z.string().describe('The event UUID'),
      userId: z.string().optional().describe('The user UUID (auto-filled if logged in)'),
    },
    async ({ eventId, userId: explicitUserId }) => {
      let userId: string;
      try { userId = resolveUserId(explicitUserId); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data: signup, error: signupError } = await supabase
        .from('evt_signups')
        .select('signup_id, event_id, user_id, status, created_at, checked_in, checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (signupError) {
        return { content: [{ type: 'text' as const, text: `Error: ${signupError.message}` }] };
      }

      if (!signup) {
        return { content: [{ type: 'text' as const, text: JSON.stringify(null, null, 2) }] };
      }

      const [{ data: profile }, { data: expectation }] = await Promise.all([
        supabase.from('usr_profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('expctn_event').select('*').eq('event_id', eventId).eq('user_id', userId).eq('status', 'active').maybeSingle(),
      ]);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ...signup,
            checked_in: signup.checked_in || false,
            profile: profile ?? null,
            expectation: expectation ?? null,
          }, null, 2),
        }],
      };
    }
  );
}
