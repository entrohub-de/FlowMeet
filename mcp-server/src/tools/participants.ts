import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';
import { requireHostAccess, resolveUserId } from '../auth.js';

export function registerParticipantTools(server: McpServer) {
  // ── Host-only ───────────────────────────────────────────────────────

  server.tool(
    'host_get_participant_state',
    'Get a participant\'s current state in an event (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      userId: z.string().describe('The user UUID'),
    },
    async ({ eventId, userId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data, error } = await supabase
        .from('evt_participant_state')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'host_update_participant_state',
    'Update a participant\'s state in an event (upsert) (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      userId: z.string().describe('The user UUID'),
      flow_step_id: z.string().optional().describe('Current flow step ID'),
      participant_status: z.string().optional().describe('Participant status'),
      current_match_id: z.string().optional().describe('Current match ID'),
      current_group_id: z.string().optional().describe('Current group ID'),
      is_online: z.boolean().optional().describe('Whether the participant is online'),
    },
    async ({ eventId, userId, ...patch }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
      );

      const { error } = await supabase
        .from('evt_participant_state')
        .upsert(
          {
            event_id: eventId,
            user_id: userId,
            ...cleanPatch,
            last_connected_at: new Date().toISOString(),
          },
          { onConflict: 'event_id,user_id' }
        );

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: 'Participant state updated successfully.' }] };
    }
  );

  // ── User-only ───────────────────────────────────────────────────────

  server.tool(
    'user_get_my_state',
    'Get current user\'s participant state in an event',
    {
      eventId: z.string().describe('The event UUID'),
      userId: z.string().optional().describe('The user UUID (auto-filled if logged in)'),
    },
    async ({ eventId, userId: explicitUserId }) => {
      let userId: string;
      try { userId = resolveUserId(explicitUserId); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data, error } = await supabase
        .from('evt_participant_state')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );
}
