import { describe, it, expect } from 'vitest';
import { calculateMatchScore } from '@/lib/api/matching-algorithm';
import type { Profile, Preferences, NetworkingIntent } from '@/types/domain';

type UserWithPreferences = Parameters<typeof calculateMatchScore>[0];

function makeUser(overrides: {
  userId?: string;
  nickname?: string;
  industry_background?: string | null;
  interests?: string | null;
  startup_stage?: string | null;
  languages?: string | null;
  networkingIntent?: NetworkingIntent | null;
  preferences?: null;
  preferred_topics_tags?: string[];
  avgRating?: number | null;
} = {}): UserWithPreferences {
  const userId = overrides.userId ?? 'user-1';
  const profile: Profile = {
    id: 1,
    created_at: '2024-01-01T00:00:00Z',
    user_id: userId,
    nickname: overrides.nickname ?? 'Test User',
    gender: null,
    age_group: null,
  };

  const preferences: Preferences | null =
    overrides.preferences === null
      ? null
      : {
          id: 1,
          created_at: '2024-01-01T00:00:00Z',
          user_id: userId,
          industry_background: overrides.industry_background ?? null,
          interests: overrides.interests ?? null,
          startup_stage: overrides.startup_stage ?? null,
          languages: overrides.languages ?? null,
        };

  return {
    profile,
    preferences,
    networkingIntent: overrides.networkingIntent ?? null,
    eventPreferences: overrides.preferred_topics_tags
      ? { preferred_topics_tags: overrides.preferred_topics_tags }
      : null,
    avgRating: overrides.avgRating ?? null,
  };
}

describe('calculateMatchScore', () => {
  // --- Complementary backgrounds ---
  it('scores complementary backgrounds (engineer + marketing_sales → 15pts)', () => {
    const u1 = makeUser({ userId: 'u1', industry_background: 'engineer' });
    const u2 = makeUser({ userId: 'u2', industry_background: 'marketing_sales' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(15);
    expect(result.reasons).toContain('互补职业背景');
  });

  it('caps multiple complementary backgrounds at 30pts', () => {
    const u1 = makeUser({ userId: 'u1', industry_background: 'engineer,marketing_sales' });
    const u2 = makeUser({ userId: 'u2', industry_background: 'marketing_sales,engineer' });
    // engineer↔marketing_sales (both directions) = 2 complementary pairs × 15 = 30
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(30);
    expect(result.reasons).toContain('互补职业背景');
  });

  // --- Same backgrounds ---
  it('scores same backgrounds (5pts each, capped at 10)', () => {
    const u1 = makeUser({ userId: 'u1', industry_background: 'student_research' });
    const u2 = makeUser({ userId: 'u2', industry_background: 'student_research' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons).toContain('相同职业背景');
  });

  it('caps same backgrounds at 10pts', () => {
    const u1 = makeUser({ userId: 'u1', industry_background: 'student_research,other1,other2' });
    const u2 = makeUser({ userId: 'u2', industry_background: 'student_research,other1,other2' });
    const result = calculateMatchScore(u1, u2);
    // 3 same × 5 = 15 → capped at 10
    expect(result.score).toBe(10);
  });

  it('complementary takes priority over same (no same reason)', () => {
    const u1 = makeUser({ userId: 'u1', industry_background: 'engineer' });
    const u2 = makeUser({ userId: 'u2', industry_background: 'engineer,marketing_sales' });
    const result = calculateMatchScore(u1, u2);
    expect(result.reasons).toContain('互补职业背景');
    expect(result.reasons).not.toContain('相同职业背景');
  });

  // --- Interest overlap ---
  it('scores 1 common interest → 8pts', () => {
    const u1 = makeUser({ userId: 'u1', interests: 'startup,tech_ai' });
    const u2 = makeUser({ userId: 'u2', interests: 'startup,career' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(8);
    expect(result.reasons.some(r => r.startsWith('共同兴趣'))).toBe(true);
  });

  it('caps interest overlap at 20pts (3+ common)', () => {
    const u1 = makeUser({ userId: 'u1', interests: 'a,b,c,d' });
    const u2 = makeUser({ userId: 'u2', interests: 'a,b,c,d' });
    const result = calculateMatchScore(u1, u2);
    // 4 common × 8 = 32 → capped at 20
    expect(result.score).toBe(20);
  });

  // --- Startup stage ---
  it('scores same startup stage → 15pts', () => {
    const u1 = makeUser({ userId: 'u1', startup_stage: 'seed' });
    const u2 = makeUser({ userId: 'u2', startup_stage: 'seed' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(15);
    expect(result.reasons).toContain('相同创业阶段');
  });

  it('scores adjacent startup stage → 8pts', () => {
    const u1 = makeUser({ userId: 'u1', startup_stage: 'seed' });
    const u2 = makeUser({ userId: 'u2', startup_stage: 'idea' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(8);
    expect(result.reasons).toContain('相近创业阶段');
  });

  it('scores non-adjacent startup stages → 0pts', () => {
    const u1 = makeUser({ userId: 'u1', startup_stage: 'not_started' });
    const u2 = makeUser({ userId: 'u2', startup_stage: 'growth' });
    const result = calculateMatchScore(u1, u2);
    // No other dimensions match → baseline 5
    expect(result.score).toBe(5);
    expect(result.reasons).not.toContain('相同创业阶段');
    expect(result.reasons).not.toContain('相近创业阶段');
  });

  // --- Networking intent ---
  it('scores same networking intent → 10pts', () => {
    const u1 = makeUser({ userId: 'u1', networkingIntent: 'find_cofounder' });
    const u2 = makeUser({ userId: 'u2', networkingIntent: 'find_cofounder' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(10);
    expect(result.reasons).toContain('相同社交目标');
  });

  it('scores different networking intent → 0pts', () => {
    const u1 = makeUser({ userId: 'u1', networkingIntent: 'find_cofounder' });
    const u2 = makeUser({ userId: 'u2', networkingIntent: 'learn_exchange' });
    const result = calculateMatchScore(u1, u2);
    // No other dimensions → baseline 5
    expect(result.score).toBe(5);
    expect(result.reasons).not.toContain('相同社交目标');
  });

  // --- Language overlap ---
  it('scores 1 common language → 5pts', () => {
    const u1 = makeUser({ userId: 'u1', languages: 'chinese,english' });
    const u2 = makeUser({ userId: 'u2', languages: 'chinese,german' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons.some(r => r.startsWith('共同语言'))).toBe(true);
  });

  it('caps language overlap at 10pts (2+ common)', () => {
    const u1 = makeUser({ userId: 'u1', languages: 'chinese,english,german' });
    const u2 = makeUser({ userId: 'u2', languages: 'chinese,english,german' });
    const result = calculateMatchScore(u1, u2);
    // 3 common × 5 = 15 → capped at 10
    expect(result.score).toBe(10);
  });

  // --- Topic tag overlap ---
  it('scores 1 common topic tag → 5pts', () => {
    const u1 = makeUser({ userId: 'u1', preferred_topics_tags: ['fundraising', 'product_dev'] });
    const u2 = makeUser({ userId: 'u2', preferred_topics_tags: ['fundraising', 'tech_trends'] });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons).toContain('共同话题兴趣');
  });

  it('caps topic tag overlap at 10pts', () => {
    const u1 = makeUser({ userId: 'u1', preferred_topics_tags: ['a', 'b', 'c'] });
    const u2 = makeUser({ userId: 'u2', preferred_topics_tags: ['a', 'b', 'c'] });
    const result = calculateMatchScore(u1, u2);
    // 3 common × 5 = 15 → capped at 10
    expect(result.score).toBe(10);
  });

  // --- History feedback bonus ---
  it('adds rating bonus for well-rated users', () => {
    const u1 = makeUser({ userId: 'u1', avgRating: 4.5 });
    const u2 = makeUser({ userId: 'u2', avgRating: 4.0 });
    const result = calculateMatchScore(u1, u2);
    // baseline 5 + bonus (avg 4.25 → round = 4)
    expect(result.score).toBe(9);
    expect(result.reasons).toContain('口碑良好');
  });

  it('does not add bonus when no ratings', () => {
    const u1 = makeUser({ userId: 'u1' });
    const u2 = makeUser({ userId: 'u2' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons).not.toContain('口碑良好');
  });

  // --- Baseline / no preferences ---
  it('returns baseline 5pts when no preferences match', () => {
    const u1 = makeUser({ userId: 'u1' });
    const u2 = makeUser({ userId: 'u2' });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons).toEqual(['探索新朋友']);
  });

  it('returns baseline 5pts when preferences are null', () => {
    const u1 = makeUser({ userId: 'u1', preferences: null });
    const u2 = makeUser({ userId: 'u2', preferences: null });
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(5);
    expect(result.reasons).toEqual(['探索新朋友']);
  });

  // --- Maximum score ---
  it('caps maximum possible score at 100', () => {
    const u1 = makeUser({
      userId: 'u1',
      industry_background: 'engineer,marketing_sales',
      interests: 'a,b,c',
      startup_stage: 'seed',
      networkingIntent: 'find_cofounder',
      languages: 'chinese,english,german',
    });
    const u2 = makeUser({
      userId: 'u2',
      industry_background: 'marketing_sales,engineer',
      interests: 'a,b,c',
      startup_stage: 'seed',
      networkingIntent: 'find_cofounder',
      languages: 'chinese,english,german',
    });
    const result = calculateMatchScore(u1, u2);
    // complementary: 30 + interests: 20 + stage: 15 + intent: 10 + languages: 10 = 85
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBe(85);
  });

  // --- Score rounding ---
  it('score is always a rounded integer', () => {
    const u1 = makeUser({ userId: 'u1', interests: 'startup' });
    const u2 = makeUser({ userId: 'u2', interests: 'startup' });
    const result = calculateMatchScore(u1, u2);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  // --- Return shape ---
  it('returns correct userId, profile, and preferences from user2', () => {
    const u1 = makeUser({ userId: 'u1', nickname: 'Alice' });
    const u2 = makeUser({ userId: 'u2', nickname: 'Bob', languages: 'english' });
    const result = calculateMatchScore(u1, u2);
    expect(result.userId).toBe('u2');
    expect(result.profile.user_id).toBe('u2');
    expect(result.profile.nickname).toBe('Bob');
    expect(result.preferences).toBe(u2.preferences);
  });
});
