import type { Profile, Preferences, NetworkingIntent } from '@/types/domain';

export interface EventPreferences {
  preferred_topics_tags?: string[];
}

export interface UserWithPreferences {
  profile: Profile;
  preferences: Preferences | null;
  networkingIntent?: NetworkingIntent | null;
  eventPreferences?: EventPreferences | null;
  /** Average rating score received from past matches (0-5) */
  avgRating?: number | null;
}

export interface MatchScore {
  userId: string;
  score: number;
  reasons: string[];
  profile: Profile;
  preferences: Preferences | null;
}

/**
 * 职业背景互补对照表
 * 基于 FlowMeet 问卷数据：Engineer↔Marketing 是最有价值的互补组合
 */
const COMPLEMENTARY_PAIRS: Record<string, string[]> = {
  engineer: ['marketing_sales', 'product_manager', 'designer', 'founder'],
  marketing_sales: ['engineer', 'product_manager', 'designer', 'founder'],
  founder: ['engineer', 'marketing_sales', 'finance_legal'],
  student_research: ['founder', 'engineer', 'marketing_sales'],
  product_manager: ['engineer', 'designer', 'marketing_sales'],
  designer: ['engineer', 'product_manager', 'marketing_sales'],
  finance_legal: ['founder', 'engineer'],
  operations: ['founder', 'engineer', 'marketing_sales'],
};

/**
 * 计算两个用户之间的匹配分数
 * 分数范围：0-100（+ 最多 5 分历史反馈 bonus，独立叠加）
 *
 * 权重分配：
 * - 职业背景（互补）：30分
 * - 兴趣话题（重叠）：20分
 * - 创业阶段（相似）：15分
 * - 期望话题标签（重叠）：10分
 * - 社交意图（对齐）：10分
 * - 语言（重叠）：10分
 * - 基础分：5分（保底）
 * - 历史反馈 bonus：+5 max（独立叠加）
 */
export function calculateMatchScore(
  user1: UserWithPreferences,
  user2: UserWithPreferences
): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  const prefs1 = user1.preferences;
  const prefs2 = user2.preferences;

  // 1. 职业背景 — 互补匹配 (权重: 30分)
  if (prefs1?.industry_background && prefs2?.industry_background) {
    const bg1 = prefs1.industry_background.split(',').map(s => s.trim()).filter(Boolean);
    const bg2 = prefs2.industry_background.split(',').map(s => s.trim()).filter(Boolean);

    let complementaryCount = 0;
    let sameCount = 0;

    for (const b1 of bg1) {
      const complements = COMPLEMENTARY_PAIRS[b1] ?? [];
      for (const b2 of bg2) {
        if (complements.includes(b2)) {
          complementaryCount++;
        }
        if (b1 === b2) {
          sameCount++;
        }
      }
    }

    if (complementaryCount > 0) {
      const pts = Math.min(30, complementaryCount * 15);
      score += pts;
      reasons.push('互补职业背景');
    } else if (sameCount > 0) {
      score += Math.min(10, sameCount * 5);
      reasons.push('相同职业背景');
    }
  }

  // 2. 兴趣话题 — 重叠匹配 (权重: 20分)
  if (prefs1?.interests && prefs2?.interests) {
    const int1 = prefs1.interests.split(',').map(s => s.trim()).filter(Boolean);
    const int2 = prefs2.interests.split(',').map(s => s.trim()).filter(Boolean);
    const common = int1.filter(i => int2.includes(i));

    if (common.length > 0) {
      score += Math.min(20, common.length * 8);
      reasons.push(`共同兴趣: ${common.slice(0, 2).join(', ')}`);
    }
  }

  // 3. 创业阶段 — 相似匹配 (权重: 15分)
  if (prefs1?.startup_stage && prefs2?.startup_stage) {
    if (prefs1.startup_stage === prefs2.startup_stage) {
      score += 15;
      reasons.push('相同创业阶段');
    } else {
      const stages = ['not_started', 'idea', 'seed', 'growth', 'mature'];
      const idx1 = stages.indexOf(prefs1.startup_stage);
      const idx2 = stages.indexOf(prefs2.startup_stage);
      if (idx1 >= 0 && idx2 >= 0 && Math.abs(idx1 - idx2) === 1) {
        score += 8;
        reasons.push('相近创业阶段');
      }
    }
  }

  // 4. 期望话题标签 — 重叠匹配 (权重: 10分)
  const tags1 = user1.eventPreferences?.preferred_topics_tags ?? [];
  const tags2 = user2.eventPreferences?.preferred_topics_tags ?? [];
  if (tags1.length > 0 && tags2.length > 0) {
    const commonTags = tags1.filter(t => tags2.includes(t));
    if (commonTags.length > 0) {
      score += Math.min(10, commonTags.length * 5);
      reasons.push('共同话题兴趣');
    }
  }

  // 5. 社交意图 — 对齐匹配 (权重: 10分)
  if (user1.networkingIntent && user2.networkingIntent) {
    if (user1.networkingIntent === user2.networkingIntent) {
      score += 10;
      reasons.push('相同社交目标');
    }
  }

  // 6. 语言 — 重叠匹配 (权重: 10分)
  if (prefs1?.languages && prefs2?.languages) {
    const langs1 = prefs1.languages.split(',').map(s => s.trim()).filter(Boolean);
    const langs2 = prefs2.languages.split(',').map(s => s.trim()).filter(Boolean);
    const commonLangs = langs1.filter(l => langs2.includes(l));

    if (commonLangs.length > 0) {
      score += Math.min(10, commonLangs.length * 5);
      reasons.push(`共同语言: ${commonLangs.slice(0, 2).join(', ')}`);
    }
  }

  // 基础分：保底 5 分
  if (reasons.length === 0) {
    score = 5;
    reasons.push('探索新朋友');
  }

  // 历史反馈 bonus（独立叠加，最多 +5）
  const avg1 = user1.avgRating ?? 0;
  const avg2 = user2.avgRating ?? 0;
  if (avg1 > 0 || avg2 > 0) {
    const avgBoth = (avg1 + avg2) / (avg1 > 0 && avg2 > 0 ? 2 : 1);
    // Scale 1-5 rating to 0-5 bonus
    const bonus = Math.min(5, Math.round(avgBoth));
    if (bonus > 0) {
      score += bonus;
      reasons.push('口碑良好');
    }
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
    .sort((a, b) => b.score - a.score);

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
