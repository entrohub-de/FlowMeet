# FlowMeet MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that exposes FlowMeet's event management platform to AI assistants. Hosts can manage events, participants, matching, and workflows through natural language in Claude Desktop, Cursor, Claude Code, or any MCP-compatible client.

**FlowMeet** is a real-time social event management platform (50-200 participants) built with Next.js + Supabase. This MCP server provides direct database access to all core operations.

## Prerequisites

- **Node.js** >= 18
- A **Supabase** project with:
  - The project URL (e.g. `https://xxx.supabase.co`)
  - A **service role key** (found in Supabase Dashboard > Settings > API)

## Setup

```bash
cd mcp-server
npm install
```

Create a `.env` file (or pass environment variables via your MCP client config):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

Build and run:

```bash
npm run build    # Compiles TypeScript to dist/
npm start        # Starts the server (stdio transport)
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (must be absolute, e.g. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key with full database access (bypasses RLS) |

> **Security note**: The service role key has unrestricted access to your database. Never commit it to version control. The MCP server runs locally as a child process and is not exposed to the internet.

## Available Tools

### Event Management (6 tools)

| Tool | Description | Input Parameters |
|------|-------------|------------------|
| `list_events` | List all events with venue information | _none_ |
| `get_event` | Get a single event by ID | `eventId` (string) |
| `create_event` | Create a new event | `name` (string), `description` (string), `start_time` (string, ISO 8601), `end_time` (string, ISO 8601), `venue_id` (string, optional) |
| `update_event` | Update event fields | `eventId` (string), `name?`, `description?`, `start_time?`, `end_time?`, `status?` ("active" \| "cancelled" \| "passed") |
| `delete_event` | Delete an event | `eventId` (string) |
| `get_dashboard` | Get host dashboard with aggregated stats (signup counts, checkin counts, ratings) | _none_ |

### Signup & Check-in (3 tools)

| Tool | Description | Input Parameters |
|------|-------------|------------------|
| `list_signups` | List all signups for an event with user profiles and expectations | `eventId` (string) |
| `get_signup_count` | Get total active signup count for an event | `eventId` (string) |
| `get_checkin_stats` | Get check-in statistics (checked-in vs total) | `eventId` (string) |

### Matching (4 tools)

| Tool | Description | Input Parameters |
|------|-------------|------------------|
| `list_matches` | Get all match records for an event with user profiles | `eventId` (string) |
| `generate_pairs` | Auto-generate optimal 1v1 pairs using scoring algorithm | `eventId` (string), `readyUserIds` (string[]) |
| `persist_pairs` | Save generated pairs to the database as accepted matches | `eventId` (string), `pairs` (array of `{ user1Id, user2Id, score, reasons }`), `activeModuleId?` (string) |
| `get_match_recommendations` | Get AI-powered match recommendations via Supabase Edge Function | `eventId` (string) |

### Flow / Workflow Control (3 tools)

| Tool | Description | Input Parameters |
|------|-------------|------------------|
| `get_active_flow` | Get the current active flow for an event | `eventId` (string) |
| `update_active_flow` | Update flow state (start, pause, resume, complete steps) | `eventId` (string), `flow_status?`, `active_step_id?`, `active_step_started_at?`, `active_step_remaining_seconds?`, `started_at?`, `completed_at?`, `is_globally_paused?`, `global_pause_message?` |
| `delete_active_flow` | Reset/delete the active flow for an event | `eventId` (string) |

### Participant State (2 tools)

| Tool | Description | Input Parameters |
|------|-------------|------------------|
| `get_participant_state` | Get a participant's current state in an event | `eventId` (string), `userId` (string) |
| `update_participant_state` | Update a participant's status | `eventId` (string), `userId` (string), `participant_status?` ("checkin" \| "waiting" \| "ready" \| "matched" \| "in_conversation" \| "feedback"), `flow_step_id?`, `current_match_id?`, `current_group_id?`, `is_online?` |

## Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json` (typically at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "flowmeet": {
      "command": "node",
      "args": ["C:/absolute/path/to/flowmeet-org/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

### Cursor

Create `.cursor/mcp.json` in the project root:

```json
{
  "mcpServers": {
    "flowmeet": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

### Claude Code

Create `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "flowmeet": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJ..."
      }
    }
  }
}
```

Alternatively, add via the CLI:

```bash
claude mcp add flowmeet -- node ./mcp-server/dist/index.js
```

## Development

Run the server in dev mode with hot-reload:

```bash
npm run dev      # Uses tsx for direct TypeScript execution
```

### Testing Tools Manually

You can test the MCP server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web UI where you can browse available tools, send test requests, and inspect responses.

### Project Structure

```
mcp-server/
├── package.json
├── tsconfig.json
├── ARCHITECTURE.md       # Detailed architecture decisions
├── README.md             # This file
├── .env.example          # Environment variable template
└── src/
    ├── index.ts          # Server entry point (McpServer + StdioServerTransport)
    ├── supabase.ts       # Supabase client initialization (service role)
    └── tools/
        ├── events.ts     # Event CRUD tools
        ├── signups.ts    # Signup & check-in tools
        ├── matching.ts   # Match management tools
        ├── flows.ts      # Workflow control tools
        └── participants.ts  # Participant state tools
```

### Database Tables

The server queries the following Supabase tables:

| Table | Purpose |
|-------|---------|
| `evt_events` | Event records |
| `evt_venues` | Venue information (joined with events) |
| `evt_signups` | Event signups and check-in status |
| `usr_profiles` | User profile data |
| `usr_preferences` | User interest/language preferences |
| `match_records` | 1v1 match records |
| `match_preferences` | Per-event matching preferences |
| `session_active_flows` | Active workflow state |
| `evt_participant_state` | Real-time participant state tracking |
| `expctn_event` | Participant expectations |
| `rating_events` | Event ratings |

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture decisions, including:
- Why this is a standalone package (not inside `frontend/`)
- Transport choice rationale
- Tool handler patterns
- Security considerations
- Future extension plans
