import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';
import { requireHostAccess } from '../auth.js';

export function registerFlowTools(server: McpServer) {
  // ── Shared (no prefix) ──────────────────────────────────────────────

  server.tool(
    'get_active_flow',
    'Get the current active flow for an event',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      const { data, error } = await supabase
        .from('session_active_flows')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Host-only ───────────────────────────────────────────────────────

  server.tool(
    'host_update_active_flow',
    'Update or create the active flow state for an event (upsert) (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      template_id: z.string().nullable().optional().describe('Flow template ID'),
      template_name: z.string().optional().describe('Flow template name'),
      flow_status: z.string().optional().describe('Flow status (e.g. idle, running, paused, completed)'),
      active_step_id: z.string().nullable().optional().describe('Currently active step ID'),
      active_step_started_at: z.string().nullable().optional().describe('When the active step started (ISO 8601)'),
      active_step_remaining_seconds: z.number().nullable().optional().describe('Remaining seconds for active step'),
      started_at: z.string().nullable().optional().describe('When the flow started (ISO 8601)'),
      completed_at: z.string().nullable().optional().describe('When the flow completed (ISO 8601)'),
      is_globally_paused: z.boolean().optional().describe('Whether the flow is globally paused'),
      global_pause_message: z.string().nullable().optional().describe('Pause message shown to participants'),
    },
    async ({ eventId, ...payload }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v !== undefined)
      );

      const { error } = await supabase
        .from('session_active_flows')
        .upsert(
          { event_id: eventId, ...cleanPayload },
          { onConflict: 'event_id' }
        );

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: 'Active flow updated successfully.' }] };
    }
  );

  server.tool(
    'host_delete_active_flow',
    'Delete/reset the active flow for an event (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { error } = await supabase
        .from('session_active_flows')
        .delete()
        .eq('event_id', eventId);

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: 'Active flow deleted successfully.' }] };
    }
  );
}
