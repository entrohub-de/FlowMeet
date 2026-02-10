import type { Profile, Preferences } from '@/types/domain';

export interface UserWithPreferences {
  profile: Profile;
  preferences: Preferences | null;
}

export interface MatchScore {
  userId: string;
  score: number;
  reasons: string[];
  profile: Profile;
  preferences: Preferences | null;
}

/**
 * 计算两个用户之间的匹配分数
 * 分数范围：0-100
 */
export function calculateMatchScore(
  user1: UserWithPreferences,
  user2: UserWithPreferences
): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. 年龄段匹配 (权重: 15分)
  if (user1.profile.age_group && user2.profile.age_group) {
    if (user1.profile.age_group === user2.profile.age_group) {
      score += 15;
      reasons.push('相同年龄段');
    } else {
      // 相邻年龄段给一半分数
      const ageGroups = ['18-24', '25-34', '35-44', '45+'];
      const idx1 = ageGroups.indexOf(user1.profile.age_group);
      const idx2 = ageGroups.indexOf(user2.profile.age_group);
      if (Math.abs(idx1 - idx2) === 1) {
        score += 8;
        reasons.push('相近年龄段');
      }
    }
  }

  // 2. 语言能力匹配 (权重: 20分)
  if (user1.preferences?.languages && user2.preferences?.languages) {
    const langs1 = user1.preferences.languages.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const langs2 = user2.preferences.languages.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const commonLangs = langs1.filter(lang => langs2.some(l => l.includes(lang) || lang.includes(l)));

    if (commonLangs.length > 0) {
      score += Math.min(20, commonLangs.length * 10);
      reasons.push(`共同语言: ${commonLangs.slice(0, 2).join(', ')}`);
    }
  }

  // 3. 兴趣领域匹配 (权重: 25分)
  if (user1.preferences?.interests && user2.preferences?.interests) {
    const interests1 = user1.preferences.interests.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const interests2 = user2.preferences.interests.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const commonInterests = interests1.filter(interest =>
      interests2.some(i => i.includes(interest) || interest.includes(i))
    );

    if (commonInterests.length > 0) {
      score += Math.min(25, commonInterests.length * 8);
      reasons.push(`共同兴趣: ${commonInterests.slice(0, 2).join(', ')}`);
    }
  }

  // 4. 参会目的匹配 (权重: 20分)
  if (user1.preferences?.purpose && user2.preferences?.purpose) {
    const purpose1 = user1.preferences.purpose.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const purpose2 = user2.preferences.purpose.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const commonPurpose = purpose1.filter(p =>
      purpose2.some(p2 => p2.includes(p) || p.includes(p2))
    );

    if (commonPurpose.length > 0) {
      score += Math.min(20, commonPurpose.length * 10);
      reasons.push(`共同目的: ${commonPurpose.slice(0, 2).join(', ')}`);
    }
  }

  // 5. 行业背景匹配 (权重: 20分)
  if (user1.preferences?.industry_background && user2.preferences?.industry_background) {
    const industry1 = user1.preferences.industry_background.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const industry2 = user2.preferences.industry_background.toLowerCase().split(/[,，、]+/).map(s => s.trim());
    const commonIndustry = industry1.filter(ind =>
      industry2.some(i => i.includes(ind) || ind.includes(i))
    );

    if (commonIndustry.length > 0) {
      score += Math.min(20, commonIndustry.length * 10);
      reasons.push(`相似行业: ${commonIndustry.slice(0, 2).join(', ')}`);
    } else {
      // 不同行业也可能有价值（跨界交流）
      score += 5;
      reasons.push('跨界交流机会');
    }
  }

  // 如果没有任何匹配原因，给一个基础分
  if (reasons.length === 0) {
    score = 30;
    reasons.push('探索新朋友');
  }

  return {
    userId: user2.profile.user_id,
    score: Math.min(100, Math.round(score)),
    reasons,
    profile: user2.profile,
    preferences: user2.preferences,
  };
}

/**
 * 为当前用户生成推荐的匹配列表
 * @param currentUser 当前用户的资料和偏好
 * @param availableUsers 可配对的用户列表（带资料和偏好）
 * @returns 按匹配分数排序的推荐列表
 */
export function generateMatchRecommendations(
  currentUser: UserWithPreferences,
  availableUsers: UserWithPreferences[]
): MatchScore[] {
  const recommendations = availableUsers
    .map(user => calculateMatchScore(currentUser, user))
    .sort((a, b) => b.score - a.score); // 按分数降序排序

  return recommendations;
}

/**
 * 获取匹配度等级
 */
export function getMatchLevel(score: number): {
  level: 'excellent' | 'good' | 'fair' | 'low';
  label: string;
  color: string;
} {
  if (score >= 70) {
    return { level: 'excellent', label: '高度匹配', color: 'text-green-600' };
  } else if (score >= 50) {
    return { level: 'good', label: '较好匹配', color: 'text-blue-600' };
  } else if (score >= 30) {
    return { level: 'fair', label: '一般匹配', color: 'text-yellow-600' };
  } else {
    return { level: 'low', label: '低匹配度', color: 'text-gray-600' };
  }
}
