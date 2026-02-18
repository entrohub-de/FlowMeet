/**
 * API Key validation for external AI Agent access.
 *
 * Keys are stored in the FLOWMEET_API_KEYS env var as comma-separated
 * "name:value" pairs, e.g. "agent1:sk-xxx,agent2:sk-yyy".
 */

export interface ApiKeyInfo {
  valid: boolean;
  agentName?: string;
}

let parsedKeys: Map<string, string> | null = null;

function getKeys(): Map<string, string> {
  if (parsedKeys) return parsedKeys;

  const raw = process.env.FLOWMEET_API_KEYS || '';
  parsedKeys = new Map<string, string>();

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;
    const name = trimmed.slice(0, colonIdx);
    const value = trimmed.slice(colonIdx + 1);
    if (value) parsedKeys.set(value, name);
  }

  return parsedKeys;
}

export function validateApiKey(key: string): ApiKeyInfo {
  const keys = getKeys();
  const agentName = keys.get(key);
  if (agentName) return { valid: true, agentName };
  return { valid: false };
}
