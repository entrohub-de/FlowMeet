import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';
import { requireHostAccess, resolveUserId } from '../auth.js';

export function registerMatchingTools(server: McpServer) {
  // ── Host-only ───────────────────────────────────────────────────────

  server.tool(
    'host_list_matches',
    'Get all matches for an event with user profiles (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data: matches, error: matchError } = await supabase
        .from('match_records')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (matchError) {
        return { content: [{ type: 'text' as const, text: `Error: ${matchError.message}` }] };
      }

      if (!matches || matches.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify([], null, 2) }] };
      }

      const userIds = new Set<string>();
      matches.forEach((match: { user1_id: string; user2_id: string }) => {
        userIds.add(match.user1_id);
        userIds.add(match.user2_id);
      });

      const { data: profiles } = await supabase
        .from('usr_profiles')
        .select('*')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enriched = matches.map((match: { user1_id: string; user2_id: string }) => ({
        ...match,
        user1_profile: profileMap.get(match.user1_id) ?? null,
        user2_profile: profileMap.get(match.user2_id) ?? null,
      }));

      return { content: [{ type: 'text' as const, text: JSON.stringify(enriched, null, 2) }] };
    }
  );

  server.tool(
    'host_generate_pairs',
    'Auto-generate optimal 1v1 pairs from ready user IDs. Returns pairs with scores but does NOT persist them yet. (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      readyUserIds: z.array(z.string()).describe('Array of user UUIDs who are ready for matching'),
    },
    async ({ eventId, readyUserIds }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      if (readyUserIds.length < 2) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ pairs: [], unpairedUserId: readyUserIds[0] ?? null }, null, 2),
          }],
        };
      }

      const { data: existingMatches } = await supabase
        .from('match_records')
        .select('user1_id, user2_id')
        .eq('event_id', eventId);

      const historySet = new Set<string>();
      if (existingMatches) {
        for (const m of existingMatches) {
          historySet.add(`${m.user1_id}:${m.user2_id}`);
          historySet.add(`${m.user2_id}:${m.user1_id}`);
        }
      }

      const { data: profiles } = await supabase
        .from('usr_profiles')
        .select('*')
        .in('user_id', readyUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const shuffled = [...readyUserIds].sort(() => Math.random() - 0.5);
      const paired = new Set<string>();
      const pairs: Array<{ user1Id: string; user2Id: string; score: number; reasons: string[] }> = [];

      for (let i = 0; i < shuffled.length; i++) {
        if (paired.has(shuffled[i])) continue;
        for (let j = i + 1; j < shuffled.length; j++) {
          if (paired.has(shuffled[j])) continue;
          if (historySet.has(`${shuffled[i]}:${shuffled[j]}`)) continue;

          const hasProfiles = profileMap.has(shuffled[i]) && profileMap.has(shuffled[j]);
          pairs.push({
            user1Id: shuffled[i],
            user2Id: shuffled[j],
            score: hasProfiles ? 50 : 0,
            reasons: hasProfiles ? ['Server-side pairing'] : ['Random pairing'],
          });
          paired.add(shuffled[i]);
          paired.add(shuffled[j]);
          break;
        }
      }

      const unpairedUserId = readyUserIds.find(id => !paired.has(id)) ?? null;

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ pairs, unpairedUserId }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'host_persist_pairs',
    'Save generated pairs to the database as accepted matches (host only)',
    {
      eventId: z.string().describe('The event UUID'),
      pairs: z.array(z.object({
        user1Id: z.string(),
        user2Id: z.string(),
        score: z.number().optional(),
        reasons: z.array(z.string()).optional(),
      })).describe('Array of pairs to persist'),
    },
    async ({ eventId, pairs }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      if (pairs.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ results: [], errors: [] }, null, 2) }] };
      }

      const results: Array<{ user1Id: string; user2Id: string; matchId: string }> = [];
      const errors: string[] = [];

      for (const pair of pairs) {
        const { data, error } = await supabase.rpc('host_upsert_match', {
          p_event_id: eventId,
          p_user1_id: pair.user1Id,
          p_user2_id: pair.user2Id,
          p_status: 'accepted',
          p_active_module_id: null,
        });

        if (!error && data) {
          const matchId = data as string;
          results.push({ user1Id: pair.user1Id, user2Id: pair.user2Id, matchId });

          if (pair.score !== undefined || pair.reasons !== undefined) {
            await supabase
              .from('match_records')
              .update({
                ...(pair.score !== undefined ? { match_score: pair.score } : {}),
                ...(pair.reasons !== undefined ? { match_reasons: pair.reasons } : {}),
              })
              .eq('match_id', matchId);
          }
        } else {
          errors.push(`Pair ${pair.user1Id}-${pair.user2Id}: ${error?.message ?? 'Unknown error'}`);
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ results, errors }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'host_get_match_recommendations',
    'Get AI-powered match recommendations for an event (host only)',
    { eventId: z.string().describe('The event UUID') },
    async ({ eventId }) => {
      try { requireHostAccess(); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data, error } = await supabase.functions.invoke('get-match-recommendations', {
        body: { eventId },
      });

      if (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(data?.recommendations ?? [], null, 2),
        }],
      };
    }
  );

  // ── User-only ───────────────────────────────────────────────────────

  server.tool(
    'user_get_my_matches',
    'Get current user\'s matches for an event',
    {
      eventId: z.string().describe('The event UUID'),
      userId: z.string().optional().describe('The user UUID (auto-filled if logged in)'),
    },
    async ({ eventId, userId: explicitUserId }) => {
      let userId: string;
      try { userId = resolveUserId(explicitUserId); } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error: ${(e as Error).message}` }] };
      }
      const { data: matches, error: matchError } = await supabase
        .from('match_records')
        .select('*')
        .eq('event_id', eventId)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (matchError) {
        return { content: [{ type: 'text' as const, text: `Error: ${matchError.message}` }] };
      }

      if (!matches || matches.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify([], null, 2) }] };
      }

      // Get the other user's profile for each match
      const otherUserIds = matches.map((m: { user1_id: string; user2_id: string }) =>
        m.user1_id === userId ? m.user2_id : m.user1_id
      );

      const { data: profiles } = await supabase
        .from('usr_profiles')
        .select('*')
        .in('user_id', otherUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const enriched = matches.map((match: { user1_id: string; user2_id: string }) => {
        const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
        return {
          ...match,
          partner_profile: profileMap.get(otherUserId) ?? null,
        };
      });

      return { content: [{ type: 'text' as const, text: JSON.stringify(enriched, null, 2) }] };
    }
  );
}
