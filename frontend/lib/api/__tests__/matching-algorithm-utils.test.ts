import { describe, it, expect } from 'vitest';
import {
  getMatchLevel,
  generateMatchRecommendations,
  type UserWithPreferences,
} from '@/lib/api/matching-algorithm';
import type { Profile, Preferences } from '@/types/domain';

function createMockUser(
  userId: string,
  overrides?: {
    preferences?: Partial<Preferences> | null;
    profile?: Partial<Profile>;
  }
): UserWithPreferences {
  return {
    profile: {
      id: Math.floor(Math.random() * 10000),
      created_at: '2024-01-01T00:00:00Z',
      user_id: userId,
      nickname: `User ${userId}`,
      gender: null,
      age_group: null,
      ...overrides?.profile,
    },
    preferences:
      overrides?.preferences === null
        ? null
        : {
            id: Math.floor(Math.random() * 10000),
            created_at: '2024-01-01T00:00:00Z',
            user_id: userId,
            languages: null,
            interests: null,
            industry_background: null,
            startup_stage: null,
            ...overrides?.preferences,
          },
  };
}

describe('getMatchLevel', () => {
  it('returns excellent for score 100', () => {
    expect(getMatchLevel(100).level).toBe('excellent');
  });

  it('returns excellent for score 70 (boundary)', () => {
    expect(getMatchLevel(70).level).toBe('excellent');
  });

  it('returns good for score 69', () => {
    expect(getMatchLevel(69).level).toBe('good');
  });

  it('returns good for score 50 (boundary)', () => {
    expect(getMatchLevel(50).level).toBe('good');
  });

  it('returns fair for score 49', () => {
    expect(getMatchLevel(49).level).toBe('fair');
  });

  it('returns fair for score 30 (boundary)', () => {
    expect(getMatchLevel(30).level).toBe('fair');
  });

  it('returns low for score 29', () => {
    expect(getMatchLevel(29).level).toBe('low');
  });

  it('returns low for score 0', () => {
    expect(getMatchLevel(0).level).toBe('low');
  });

  it('returns correct label and color for excellent', () => {
    const result = getMatchLevel(85);
    expect(result).toEqual({
      level: 'excellent',
      label: '高度匹配',
      color: 'text-green-600',
    });
  });

  it('returns correct label and color for good', () => {
    const result = getMatchLevel(55);
    expect(result).toEqual({
      level: 'good',
      label: '较好匹配',
      color: 'text-blue-600',
    });
  });

  it('returns correct label and color for fair', () => {
    const result = getMatchLevel(35);
    expect(result).toEqual({
      level: 'fair',
      label: '一般匹配',
      color: 'text-yellow-600',
    });
  });

  it('returns correct label and color for low', () => {
    const result = getMatchLevel(10);
    expect(result).toEqual({
      level: 'low',
      label: '低匹配度',
      color: 'text-gray-600',
    });
  });
});

describe('generateMatchRecommendations', () => {
  it('returns results sorted by score descending', () => {
    const currentUser = createMockUser('current', {
      preferences: {
        interests: 'startup,tech_ai',
        industry_background: 'engineer',
        languages: 'chinese',
      },
    });

    const available = [
      createMockUser('low-match', {
        preferences: {
          interests: 'travel',
          industry_background: 'finance_legal',
          languages: 'german',
        },
      }),
      createMockUser('high-match', {
        preferences: {
          interests: 'startup,tech_ai',
          industry_background: 'marketing_sales',
          languages: 'chinese',
        },
      }),
      createMockUser('mid-match', {
        preferences: {
          interests: 'startup',
          industry_background: 'designer',
          languages: 'english',
        },
      }),
    ];

    const results = generateMatchRecommendations(currentUser, available);

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
    }
  });

  it('returns empty array for empty available users', () => {
    const currentUser = createMockUser('current');
    const results = generateMatchRecommendations(currentUser, []);
    expect(results).toEqual([]);
  });

  it('returns array of 1 for single available user', () => {
    const currentUser = createMockUser('current');
    const other = createMockUser('other');
    const results = generateMatchRecommendations(currentUser, [other]);
    expect(results).toHaveLength(1);
  });

  it('does not include currentUser in results when not in availableUsers', () => {
    const currentUser = createMockUser('current', {
      preferences: { interests: 'startup' },
    });
    const available = [
      createMockUser('user-a', { preferences: { interests: 'startup' } }),
      createMockUser('user-b', { preferences: { interests: 'tech_ai' } }),
    ];

    const results = generateMatchRecommendations(currentUser, available);
    const resultUserIds = results.map(r => r.userId);
    expect(resultUserIds).not.toContain('current');
    expect(results).toHaveLength(2);
  });

  it('all results have valid userId from available users', () => {
    const currentUser = createMockUser('current');
    const available = [
      createMockUser('alpha'),
      createMockUser('beta'),
      createMockUser('gamma'),
    ];

    const results = generateMatchRecommendations(currentUser, available);
    const availableIds = available.map(u => u.profile.user_id);

    for (const result of results) {
      expect(availableIds).toContain(result.userId);
    }
  });
});
