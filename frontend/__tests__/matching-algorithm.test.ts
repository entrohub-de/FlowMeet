import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMatchScore,
  generateMatchRecommendations,
  getMatchLevel,
  type UserWithPreferences,
} from '@/lib/api/matching-algorithm';
import type { Profile, Preferences } from '@/types/domain';

// --- Mock Supabase (needed by auto-pairing) ---
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => ({ data: [], error: null })),
          single: vi.fn(() => ({ data: null, error: null })),
        })),
        in: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
    rpc: vi.fn(() => ({ data: 'mock-match-id', error: null })),
  },
}));

// --- Helpers ---
function makeProfile(userId: string, overrides?: Partial<Profile>): Profile {
  return {
    id: 1,
    created_at: '2025-01-01',
    user_id: userId,
    nickname: `User ${userId}`,
    gender: null,
    age_group: null,
    ...overrides,
  };
}

function makeUser(
  userId: string,
  prefs?: Partial<Preferences> | null,
  networkingIntent?: UserWithPreferences['networkingIntent']
): UserWithPreferences {
  return {
    profile: makeProfile(userId),
    preferences: prefs
      ? {
          id: 1,
          created_at: '2025-01-01',
          user_id: userId,
          languages: null,
          interests: null,
          industry_background: null,
          startup_stage: null,
          ...prefs,
        }
      : null,
    networkingIntent: networkingIntent ?? null,
  };
}

// ============================================================
// 1. calculateMatchScore
// ============================================================
describe('calculateMatchScore', () => {
  it('returns high score when interests, languages, industry all overlap', () => {
    const u1 = makeUser('a', {
      interests: 'startup,tech_ai,career',
      languages: 'chinese,english',
      industry_background: 'engineer,product_manager',
      startup_stage: 'seed',
    }, 'learn_exchange');

    const u2 = makeUser('b', {
      interests: 'startup,tech_ai,career',
      languages: 'chinese,english',
      industry_background: 'marketing_sales,founder',
      startup_stage: 'seed',
    }, 'learn_exchange');

    // complementary: engineer*marketing_sales + engineer*founder + product_manager*marketing_sales = 3 pairs => min(30, 45)=30
    // interests: 3 common => min(25, 30) = 25
    // stage: same => 15
    // intent: same => 10
    // languages: 2 common => 10
    // total = 90
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.userId).toBe('b');
  });

  it('gives complementary career bonus for engineer + marketing_sales', () => {
    const engineer = makeUser('a', { industry_background: 'engineer' });
    const marketer = makeUser('b', { industry_background: 'marketing_sales' });

    const result = calculateMatchScore(engineer, marketer);
    // Complementary = 15 pts (capped at 30), no other factors => base 10 not applied
    expect(result.score).toBeGreaterThan(0);
    expect(result.reasons).toContain('互补职业背景');
  });

  it('returns base score (10) when both users have no preferences', () => {
    const u1 = makeUser('a');
    const u2 = makeUser('b');
    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBe(10);
    expect(result.reasons).toContain('探索新朋友');
  });

  it('returns score between 10-30 when only one user has preferences', () => {
    const withPrefs = makeUser('a', {
      interests: 'startup,tech_ai',
      languages: 'chinese',
      industry_background: 'engineer',
      startup_stage: 'seed',
    });
    const noPrefs = makeUser('b');

    const result = calculateMatchScore(withPrefs, noPrefs);
    // No overlap possible => base score
    expect(result.score).toBeGreaterThanOrEqual(10);
    expect(result.score).toBeLessThanOrEqual(30);
  });

  it('gives startup stage bonus when both are same stage', () => {
    const u1 = makeUser('a', { startup_stage: 'seed' });
    const u2 = makeUser('b', { startup_stage: 'seed' });
    const result = calculateMatchScore(u1, u2);
    expect(result.reasons).toContain('相同创业阶段');
    // 15 (stage) => reasons includes stage, so base 10 not added
    expect(result.score).toBe(15);
  });

  it('gives adjacent stage bonus', () => {
    const u1 = makeUser('a', { startup_stage: 'seed' });
    const u2 = makeUser('b', { startup_stage: 'growth' });
    const result = calculateMatchScore(u1, u2);
    expect(result.reasons).toContain('相近创业阶段');
    expect(result.score).toBe(8);
  });

  it('gives networking intent bonus when both have same intent', () => {
    const u1 = makeUser('a', {}, 'find_cofounder');
    const u2 = makeUser('b', {}, 'find_cofounder');
    const result = calculateMatchScore(u1, u2);
    expect(result.reasons).toContain('相同社交目标');
    expect(result.score).toBe(10);
  });

  it('gives language overlap bonus', () => {
    const u1 = makeUser('a', { languages: 'chinese,english,german' });
    const u2 = makeUser('b', { languages: 'chinese,german' });
    const result = calculateMatchScore(u1, u2);
    expect(result.reasons.some(r => r.startsWith('共同语言'))).toBe(true);
    // 2 common languages * 5 = 10
    expect(result.score).toBe(10);
  });

  it('caps score at 100', () => {
    // Max everything: complementary 30 + interests 25 + stage 15 + intent 10 + language 10 = 90
    const u1 = makeUser('a', {
      industry_background: 'engineer',
      interests: 'startup,tech_ai,career',
      startup_stage: 'seed',
      languages: 'chinese,english',
    }, 'find_cofounder');

    const u2 = makeUser('b', {
      industry_background: 'marketing_sales,founder',
      interests: 'startup,tech_ai,career',
      startup_stage: 'seed',
      languages: 'chinese,english',
    }, 'find_cofounder');

    const result = calculateMatchScore(u1, u2);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ============================================================
// 2. generateMatchRecommendations
// ============================================================
describe('generateMatchRecommendations', () => {
  it('returns candidates sorted by score descending', () => {
    const current = makeUser('me', {
      industry_background: 'engineer',
      interests: 'startup',
    });

    const candidates = [
      makeUser('low', {}),
      makeUser('high', {
        industry_background: 'marketing_sales',
        interests: 'startup',
      }),
      makeUser('mid', { interests: 'startup' }),
    ];

    const results = generateMatchRecommendations(current, candidates);
    expect(results.length).toBe(3);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
    expect(results[0].userId).toBe('high');
  });

  it('returns empty array when no candidates', () => {
    const current = makeUser('me', { interests: 'startup' });
    const results = generateMatchRecommendations(current, []);
    expect(results).toEqual([]);
  });

  it('returns all base scores when nobody has preferences', () => {
    const current = makeUser('me');
    const candidates = [makeUser('a'), makeUser('b'), makeUser('c')];
    const results = generateMatchRecommendations(current, candidates);
    expect(results.length).toBe(3);
    results.forEach(r => expect(r.score).toBe(10));
  });
});

// ============================================================
// 3. getMatchLevel
// ============================================================
describe('getMatchLevel', () => {
  it.each([
    [100, 'excellent'],
    [70, 'excellent'],
    [69, 'good'],
    [50, 'good'],
    [49, 'fair'],
    [30, 'fair'],
    [29, 'low'],
    [0, 'low'],
  ] as const)('score %i => level "%s"', (score, expectedLevel) => {
    expect(getMatchLevel(score).level).toBe(expectedLevel);
  });
});

// ============================================================
// 4. generatePairs (auto-pairing with mocked Supabase)
// ============================================================
describe('generatePairs', () => {
  // Re-import with fresh mock per test
  let generatePairs: typeof import('@/lib/api/auto-pairing').generatePairs;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();

    // Build chainable mock for supabase.from()
    mockFrom = vi.fn();
    const makeChain = (resolvedData: any) => {
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        update: vi.fn(() => chain),
        data: resolvedData,
        error: null,
        then: (resolve: any) => resolve({ data: resolvedData, error: null }),
      };
      // Make it thenable so `await` works
      return chain;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'match_records') {
        return makeChain([]);
      }
      if (table === 'usr_profiles') {
        return makeChain(
          testProfiles.map(id => ({
            user_id: id,
            id: 1,
            created_at: '2025-01-01',
            nickname: `User ${id}`,
            gender: null,
            age_group: null,
          }))
        );
      }
      if (table === 'usr_preferences') {
        return makeChain(testPreferences);
      }
      if (table === 'match_preferences') {
        return makeChain([]);
      }
      return makeChain([]);
    });

    vi.doMock('@/lib/supabase/client', () => ({
      supabase: {
        from: mockFrom,
        rpc: vi.fn(() => ({ data: 'mock-id', error: null })),
      },
    }));

    const mod = await import('@/lib/api/auto-pairing');
    generatePairs = mod.generatePairs;
  });

  // Test-specific data that the mock reads
  let testProfiles: string[] = [];
  let testPreferences: any[] = [];

  it('pairs 4 users into 2 pairs with no unpaired', async () => {
    testProfiles = ['a', 'b', 'c', 'd'];
    testPreferences = [];

    const result = await generatePairs('evt1', ['a', 'b', 'c', 'd']);
    expect(result.pairs.length).toBe(2);
    expect(result.unpairedUserId).toBeUndefined();
  });

  it('pairs 5 users into 2 pairs with 1 unpaired', async () => {
    testProfiles = ['a', 'b', 'c', 'd', 'e'];
    testPreferences = [];

    const result = await generatePairs('evt1', ['a', 'b', 'c', 'd', 'e']);
    expect(result.pairs.length).toBe(2);
    expect(result.unpairedUserId).toBeDefined();
  });

  it('pairs 2 users into 1 pair', async () => {
    testProfiles = ['a', 'b'];
    testPreferences = [];

    const result = await generatePairs('evt1', ['a', 'b']);
    expect(result.pairs.length).toBe(1);
    expect(result.unpairedUserId).toBeUndefined();
  });

  it('returns 0 pairs and 1 unpaired for single user', async () => {
    testProfiles = ['a'];
    testPreferences = [];

    const result = await generatePairs('evt1', ['a']);
    expect(result.pairs.length).toBe(0);
    expect(result.unpairedUserId).toBe('a');
  });

  it('avoids historically matched pairs when possible', async () => {
    testProfiles = ['a', 'b', 'c', 'd'];
    testPreferences = [];

    // Override match_records to return A-B as historical pair
    mockFrom.mockImplementation((table: string) => {
      const makeChain = (resolvedData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          update: vi.fn(() => chain),
          data: resolvedData,
          error: null,
          then: (resolve: any) => resolve({ data: resolvedData, error: null }),
        };
        return chain;
      };

      if (table === 'match_records') {
        return makeChain([{ user1_id: 'a', user2_id: 'b' }]);
      }
      if (table === 'usr_profiles') {
        return makeChain(
          ['a', 'b', 'c', 'd'].map(id => ({
            user_id: id,
            id: 1,
            created_at: '2025-01-01',
            nickname: `User ${id}`,
            gender: null,
            age_group: null,
          }))
        );
      }
      if (table === 'usr_preferences') return makeChain([]);
      if (table === 'match_preferences') return makeChain([]);
      return makeChain([]);
    });

    const result = await generatePairs('evt1', ['a', 'b', 'c', 'd']);
    // A-B should not be a pair
    const hasAB = result.pairs.some(
      p =>
        (p.user1Id === 'a' && p.user2Id === 'b') ||
        (p.user1Id === 'b' && p.user2Id === 'a')
    );
    expect(hasAB).toBe(false);
    expect(result.pairs.length).toBe(2);
  });

  it('prioritizes high-score pairs in greedy matching', async () => {
    testProfiles = ['a', 'b', 'c', 'd'];
    // a+b: engineer+marketing_sales => complementary (15pts)
    // c+d: no preferences => base score
    testPreferences = [
      {
        user_id: 'a',
        id: 1,
        created_at: '2025-01-01',
        languages: null,
        interests: null,
        industry_background: 'engineer',
        startup_stage: null,
      },
      {
        user_id: 'b',
        id: 2,
        created_at: '2025-01-01',
        languages: null,
        interests: null,
        industry_background: 'marketing_sales',
        startup_stage: null,
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      const makeChain = (resolvedData: any) => {
        const chain: any = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn(() => chain),
          update: vi.fn(() => chain),
          data: resolvedData,
          error: null,
          then: (resolve: any) => resolve({ data: resolvedData, error: null }),
        };
        return chain;
      };

      if (table === 'match_records') return makeChain([]);
      if (table === 'usr_profiles') {
        return makeChain(
          ['a', 'b', 'c', 'd'].map(id => ({
            user_id: id,
            id: 1,
            created_at: '2025-01-01',
            nickname: `User ${id}`,
            gender: null,
            age_group: null,
          }))
        );
      }
      if (table === 'usr_preferences') return makeChain(testPreferences);
      if (table === 'match_preferences') return makeChain([]);
      return makeChain([]);
    });

    const result = await generatePairs('evt1', ['a', 'b', 'c', 'd']);
    expect(result.pairs.length).toBe(2);

    // The highest scoring pair (a+b) should appear
    const abPair = result.pairs.find(
      p =>
        (p.user1Id === 'a' && p.user2Id === 'b') ||
        (p.user1Id === 'b' && p.user2Id === 'a')
    );
    expect(abPair).toBeDefined();
    expect(abPair!.score).toBeGreaterThan(0);
  });
});
