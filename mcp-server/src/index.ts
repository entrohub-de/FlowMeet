import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAuthTools } from './tools/auth.js';
import { registerEventTools } from './tools/events.js';
import { registerSignupTools } from './tools/signups.js';
import { registerMatchingTools } from './tools/matching.js';
import { registerFlowTools } from './tools/flows.js';
import { registerParticipantTools } from './tools/participants.js';

const server = new McpServer({
  name: 'flowmeet',
  version: '1.0.0',
});

registerAuthTools(server);
registerEventTools(server);
registerSignupTools(server);
registerMatchingTools(server);
registerFlowTools(server);
registerParticipantTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
