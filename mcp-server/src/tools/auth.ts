import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { login, logout, getSession } from '../auth.js';

export function registerAuthTools(server: McpServer) {
  server.tool(
    'login',
    'Login with email and password. After login, user_* tools auto-fill userId and host_* tools check permissions.',
    {
      email: z.string().describe('User email address'),
      password: z.string().describe('User password'),
    },
    async ({ email, password }) => {
      try {
        const session = await login(email, password);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              message: 'Login successful',
              userId: session.userId,
              email: session.email,
              role: session.role,
              activeView: session.activeView,
            }, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
        };
      }
    }
  );

  server.tool(
    'logout',
    'Logout and clear the current session',
    {},
    async () => {
      logout();
      return {
        content: [{ type: 'text' as const, text: 'Logged out successfully.' }],
      };
    }
  );

  server.tool(
    'whoami',
    'Show current user info, role, and active view mode',
    {},
    async () => {
      const session = getSession();
      if (!session) {
        return {
          content: [{ type: 'text' as const, text: 'Not logged in.' }],
        };
      }
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            userId: session.userId,
            email: session.email,
            role: session.role,
            activeView: session.activeView,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'switch_view',
    'Switch between host and participant view. Only users with host/admin role can switch to host view.',
    {
      view: z.enum(['host', 'participant']).describe('Target view mode'),
    },
    async ({ view }) => {
      const session = getSession();
      if (!session) {
        return {
          content: [{ type: 'text' as const, text: 'Error: Not logged in. Use login first.' }],
        };
      }

      if (view === 'host' && session.role !== 'host' && session.role !== 'admin') {
        return {
          content: [{
            type: 'text' as const,
            text: 'Error: Your account does not have host privileges.',
          }],
        };
      }

      session.activeView = view;
      return {
        content: [{
          type: 'text' as const,
          text: `Switched to ${view} view.`,
        }],
      };
    }
  );
}
