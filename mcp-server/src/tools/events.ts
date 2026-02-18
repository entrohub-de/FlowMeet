import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';
import { requireHostAccess } from '../auth.js';

const EVENT_SELECT = '*, venue:evt_venues(venue_id, name, capacity, created_at)' as const;

export function registerEventTools(server: McpServer) {
  // ── Shared (no prefix) ──────────────────────────────────────────────

  server.tool(
    'list_events',
    'List all FlowMeet events with venue information',
    {},
    async () => {
      const { data, error } = await supabase
        .from('evt_events')
        .select(EVENT_SELECT)
        .order('start_time', { ascending: true });

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_event',
    'Get event details by ID',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      const { data, error } = await supabase
        .from('evt_events')
        .select(EVENT_SELECT)
        .eq('event_id', eventId)
        .single();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Host-only ───────────────────────────────────────────────────────

  server.tool(
    'host_create_event',
    'Create a new event (host only)',
    {
      name: z.string().describe('Event name'),
      description: z.string().optional().describe('Event description'),
      start_time: z.string().describe('Start time (ISO 8601)'),
      end_time: z.string().describe('End time (ISO 8601)'),
      venue_id: z.string().optional().describe('Venue UUID'),
    },
    async ({ name, description, start_time, end_time, venue_id }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data, error } = await supabase
        .from('evt_events')
        .insert([{ name, description, start_time, end_time, venue_id: venue_id ?? null }])
        .select(EVENT_SELECT)
        .single();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'host_update_event',
    'Update event fields (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      name: z.string().optional().describe('New event name'),
      description: z.string().optional().describe('New description'),
      start_time: z.string().optional().describe('New start time (ISO 8601)'),
      end_time: z.string().optional().describe('New end time (ISO 8601)'),
      status: z.string().optional().describe('New status (e.g. draft, published, ongoing, completed, cancelled)'),
    },
    async ({ eventId, ...updates }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from('evt_events')
        .update(cleanUpdates)
        .eq('event_id', eventId)
        .select(EVENT_SELECT)
        .single();

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'host_delete_event',
    'Delete an event (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { error } = await supabase
        .from('evt_events')
        .delete()
        .eq('event_id', eventId);

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text' as const, text: 'Event deleted successfully.' }] };
    }
  );

  server.tool(
    'host_get_dashboard',
    'Get host dashboard summary with event stats (signups, checkins, ratings)',
    {},
    async () => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data: events, error } = await supabase
        .from('evt_events')
        .select(EVENT_SELECT)
        .order('start_time', { ascending: false });

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }

      if (!events || events.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              events: [],
              totals: { totalEvents: 0, totalParticipants: 0, avgRating: null, thisMonthEvents: 0 },
            }, null, 2),
          }],
        };
      }

      const eventIds = events.map((e: { event_id: string }) => e.event_id);

      const [signupsRes, ratingsRes] = await Promise.all([
        supabase.from('evt_signups').select('event_id, checked_in').eq('status', 'active').in('event_id', eventIds),
        supabase.from('rating_events').select('event_id, overall_score').in('event_id', eventIds),
      ]);

      const signupMap = new Map<string, { total: number; checkedIn: number }>();
      for (const s of signupsRes.data || []) {
        const entry = signupMap.get(s.event_id) || { total: 0, checkedIn: 0 };
        entry.total++;
        if (s.checked_in) entry.checkedIn++;
        signupMap.set(s.event_id, entry);
      }

      const ratingMap = new Map<string, { count: number; sum: number }>();
      for (const r of ratingsRes.data || []) {
        const entry = ratingMap.get(r.event_id) || { count: 0, sum: 0 };
        entry.count++;
        entry.sum += r.overall_score;
        ratingMap.set(r.event_id, entry);
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalParticipants = 0;
      let totalRatingSum = 0;
      let totalRatingCount = 0;
      let thisMonthEvents = 0;

      const enriched = events.map((e: { event_id: string; start_time: string }) => {
        const signup = signupMap.get(e.event_id) || { total: 0, checkedIn: 0 };
        const rating = ratingMap.get(e.event_id);

        totalParticipants += signup.total;
        if (rating) {
          totalRatingSum += rating.sum;
          totalRatingCount += rating.count;
        }
        if (new Date(e.start_time) >= monthStart) {
          thisMonthEvents++;
        }

        return {
          ...e,
          signup_count: signup.total,
          checkin_count: signup.checkedIn,
          rating_count: rating?.count ?? 0,
          avg_rating: rating ? Math.round((rating.sum / rating.count) * 10) / 10 : null,
        };
      });

      const result = {
        events: enriched,
        totals: {
          totalEvents: events.length,
          totalParticipants,
          avgRating: totalRatingCount > 0
            ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10
            : null,
          thisMonthEvents,
        },
      };

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
