/**
 * Expectation utility functions.
 *
 * - Predefined tags — common social goals users can pick from
 * - Serialization helpers for expectation content (tags + text → JSON)
 * - Last-used tags shortcut (localStorage)
 *
 * Template CRUD has moved to lib/api/expectation-templates.ts (Supabase).
 */

// ── Predefined tags ──

export const EXPECTATION_TAGS = [
  'networking',
  'learnMarket',
  'findCofounder',
  'justSocial',
  'shareExperience',
  'getInspiration',
  'findMentors',
  'learnSkills',
  'industryExchange',
] as const;

export type ExpectationTag = typeof EXPECTATION_TAGS[number];

export function getTagI18nKey(tag: string): string {
  return `expectations.tags.${tag}`;
}

// ── Expectation data (stored per-event in DB) ──

export interface ExpectationData {
  tags: string[];
  text: string;
}

export function parseExpectationContent(content: string): ExpectationData {
  if (!content) return { tags: [], text: '' };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tags)) {
      return { tags: parsed.tags, text: parsed.text || '' };
    }
  } catch {
    // Not JSON — legacy plain text
  }
  return { tags: [], text: content };
}

export function serializeExpectationContent(data: ExpectationData): string {
  return JSON.stringify({ tags: data.tags, text: data.text });
}

// ── Last-used tags shortcut ──

const LAST_TAGS_KEY = 'flowmeet_last_expectation_tags';

export function saveLastUsedTags(tags: string[]): void {
  try {
    localStorage.setItem(LAST_TAGS_KEY, JSON.stringify(tags));
  } catch { /* ignore */ }
}

export function getLastUsedTags(): string[] {
  try {
    const stored = localStorage.getItem(LAST_TAGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}
