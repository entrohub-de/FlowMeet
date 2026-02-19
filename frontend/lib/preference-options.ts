/**
 * Predefined options for user preferences.
 * Values are stored as comma-separated strings in the database.
 * Labels are resolved via i18n keys: `preferenceOptions.<category>.<value>`
 */

export const LANGUAGE_OPTIONS = [
  'chinese',
  'english',
  'japanese',
  'korean',
  'german',
  'french',
  'spanish',
] as const;

export const INTEREST_OPTIONS = [
  'startup',
  'tech_ai',
  'career',
  'cross_cultural',
  'investment',
  'product',
  'design',
  'marketing',
] as const;

export const PROFESSIONAL_BACKGROUND_OPTIONS = [
  'engineer',
  'marketing_sales',
  'student_research',
  'founder',
  'product_manager',
  'designer',
  'finance_legal',
  'operations',
  'other',
] as const;

/** @deprecated Use PROFESSIONAL_BACKGROUND_OPTIONS */
export const INDUSTRY_OPTIONS = PROFESSIONAL_BACKGROUND_OPTIONS;

export const NETWORKING_INTENT_OPTIONS = [
  'find_cofounder',
  'learn_exchange',
  'expand_network',
  'get_inspiration',
] as const;

export const STARTUP_STAGE_OPTIONS = [
  'not_started',
  'idea',
  'seed',
  'growth',
  'mature',
  'not_entrepreneur',
] as const;

export const TOPIC_TAG_OPTIONS = [
  'fundraising',
  'product_dev',
  'growth_hacking',
  'team_building',
  'market_entry',
  'tech_trends',
  'work_life',
  'industry_insights',
] as const;

/** Parse a comma-separated preference string into an array of values */
export function parsePreferenceString(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/** Serialize an array of values into a comma-separated string */
export function serializePreferenceArray(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.join(',');
}
