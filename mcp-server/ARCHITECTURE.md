# FlowMeet MCP Server - Architecture Decision Record

## 1. Overview

This MCP (Model Context Protocol) server exposes FlowMeet's event management capabilities as tools that AI assistants (Claude Desktop, Cursor, etc.) can invoke. It enables hosts to manage events, participants, matching, and workflows through natural language.

## 2. Technology Choices

### SDK
- **Package**: `@modelcontextprotocol/sdk` (latest, compatible with MCP spec 2025-11-25)
- **Runtime**: Node.js with TypeScript
- **Schema validation**: `zod` (required peer dependency of the SDK)

### Transport
- **Primary**: `StdioServerTransport` — ideal for local Claude Desktop / Cursor integration
- Stdio is the simplest transport: the MCP client spawns the server as a child process and communicates over stdin/stdout
- Future: Streamable HTTP transport can be added for remote/web-based clients

### Database Access
- **Direct Supabase SDK** with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Mirrors the pattern in `frontend/lib/supabase/server.ts` (`createServerClient()`)
- The MCP server is a trusted backend process; service role access is appropriate

## 3. Directory Structure

```
mcp-server/
├── ARCHITECTURE.md          # This document
├── package.json             # Standalone package (not inside frontend/)
├── tsconfig.json
├── src/
│   ├── index.ts             # Entry point: create McpServer + StdioServerTransport
│   ├── supabase.ts          # Supabase client init (service role)
│   └── tools/
│       ├── events.ts        # Event CRUD tools (shared + host)
│       ├── signups.ts       # Signup & checkin tools (host + user)
│       ├── matching.ts      # Match management tools (host + user)
│       ├── flows.ts         # Active flow / workflow tools (shared + host)
│       └── participants.ts  # Participant state tools (host + user)
└── .env.example             # Required env vars template
```

**Decision: Standalone `mcp-server/` at project root** (not inside `frontend/`).

Rationale:
- The MCP server is a separate Node.js process, not a Next.js route
- It uses the service role key (server-side only), while frontend uses the anon key
- Independent `package.json` avoids polluting the frontend dependency tree
- Cleaner separation of concerns; can be versioned/deployed independently

## 4. Server Initialization Pattern

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'flowmeet',
  version: '1.0.0',
});

// Register all tools (see Section 5)
registerEventTools(server);
registerSignupTools(server);
registerMatchingTools(server);
registerFlowTools(server);
registerParticipantTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## 5. Tool Definitions & Role-Based Access

Tools are organized by role using name prefixes:

- **No prefix** — Shared read-only tools accessible to both Host and User
- **`host_*`** — Host-only tools for managing events, participants, and matching
- **`user_*`** — User-only tools scoped to the requesting user's own data

### 5.1 Shared Tools (no prefix)

| Tool Name | Description | Input |
|-----------|-------------|-------|
| `list_events` | List all events with venue info | `{}` |
| `get_event` | Get event details by ID | `{ eventId }` |
| `get_active_flow` | Get current active flow for event | `{ eventId }` |

### 5.2 Host Tools (`host_*`)

| Tool Name | Description | Input |
|-----------|-------------|-------|
| `host_create_event` | Create a new event | `{ name, description?, start_time, end_time, venue_id? }` |
| `host_update_event` | Update event fields | `{ eventId, name?, description?, start_time?, end_time?, status? }` |
| `host_delete_event` | Delete an event | `{ eventId }` |
| `host_get_dashboard` | Get dashboard summary with stats | `{}` |
| `host_list_signups` | List all signups with profiles | `{ eventId }` |
| `host_get_signup_count` | Get signup count | `{ eventId }` |
| `host_get_checkin_stats` | Get checkin statistics | `{ eventId }` |
| `host_list_matches` | Get all matches with profiles | `{ eventId }` |
| `host_generate_pairs` | Auto-generate 1v1 pairs | `{ eventId, readyUserIds }` |
| `host_persist_pairs` | Save pairs to database | `{ eventId, pairs }` |
| `host_get_match_recommendations` | AI match recommendations | `{ eventId }` |
| `host_update_active_flow` | Update flow state (upsert) | `{ eventId, flow_status?, ... }` |
| `host_delete_active_flow` | Delete/reset active flow | `{ eventId }` |
| `host_get_participant_state` | Get any participant's state | `{ eventId, userId }` |
| `host_update_participant_state` | Update any participant's state | `{ eventId, userId, ... }` |

### 5.3 User Tools (`user_*`)

| Tool Name | Description | Input |
|-----------|-------------|-------|
| `user_get_my_signup` | Get own signup status | `{ eventId, userId }` |
| `user_get_my_matches` | Get own matches with partner profiles | `{ eventId, userId }` |
| `user_get_my_state` | Get own participant state | `{ eventId, userId }` |

## 6. Supabase Client (Service Role)

```typescript
// mcp-server/src/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```

Required environment variables:
- `SUPABASE_URL` — Supabase project URL (absolute, not the proxy path)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (full access, bypasses RLS)

## 7. Tool Handler Pattern

Each tool handler follows this pattern:

```typescript
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { supabase } from '../supabase.js';

export function registerEventTools(server: McpServer) {
  server.tool(
    'list_events',
    'List all FlowMeet events with venue information',
    {},
    async () => {
      const { data, error } = await supabase
        .from('evt_events')
        .select('*, venue:evt_venues(venue_id, name, capacity, created_at)')
        .order('start_time', { ascending: true });

      if (error) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ... more tools
}
```

Key conventions:
- Tool names use `snake_case` with role prefix (MCP convention)
- Errors are returned as text content (not thrown), so the LLM can reason about failures
- All data is returned as JSON text
- Input validated by zod schemas

## 8. Claude Desktop / Cursor Configuration

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "flowmeet": {
      "command": "node",
      "args": ["C:/path/to/flowmeet-org/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

### Cursor (`.cursor/mcp.json` in project root)

```json
{
  "mcpServers": {
    "flowmeet": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

## 9. Build & Run

```bash
cd mcp-server
npm install
npm run build    # tsc -> dist/
npm start        # node dist/index.js (stdio mode)
```

For development:
```bash
npm run dev      # tsx src/index.ts (watch mode)
```

## 10. Database Tables Referenced

Based on the existing `lib/api/` layer, the MCP server queries these Supabase tables:

| Table | Used By |
|-------|---------|
| `evt_events` | Event CRUD |
| `evt_venues` | Venue joins |
| `evt_signups` | Signup management, checkin stats |
| `usr_profiles` | User profile data |
| `usr_preferences` | User preferences |
| `match_records` | Match CRUD |
| `match_preferences` | Match preferences |
| `session_active_flows` | Active flow state |
| `evt_participant_state` | Participant state tracking |
| `expctn_event` | Expectations |
| `rating_events` | Event ratings |

## 11. Security Considerations

- The MCP server runs **locally** as a child process — not exposed to the internet
- Service role key is passed via environment variables, never hardcoded
- `.env` file must be in `.gitignore`
- Tool naming convention (`host_*` / `user_*`) provides role separation at the tool level
- `user_*` tools require explicit `userId` and only return data scoped to that user
- Future: Add tool annotations (`readOnlyHint`, `destructiveHint`) for client-side warnings

## 12. Future Extensions

- **Streamable HTTP transport**: For remote access / web-based MCP clients
- **Resources**: Expose event data as MCP resources for context injection
- **Prompts**: Pre-built prompt templates (e.g., "summarize this event", "suggest matching strategy")
- **Notifications**: Real-time event updates via MCP server-initiated notifications
- **Auth middleware**: Validate user identity server-side before executing `user_*` tools
