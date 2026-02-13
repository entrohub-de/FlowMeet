import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserWithPreferences {
  profile: any;
  preferences: any;
}

interface MatchScore {
  userId: string;
  nickname: string;
  gender: string | null;
  ageGroup: string | null;
  score: number;
  reasons: string[];
}

/**
 * 计算两个用户之间的匹配分数
 */
function calculateMatchScore(
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
    const langs1 = user1.preferences.languages.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const langs2 = user2.preferences.languages.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const commonLangs = langs1.filter((lang: string) =>
      langs2.some((l: string) => l.includes(lang) || lang.includes(l))
    );

    if (commonLangs.length > 0) {
      score += Math.min(20, commonLangs.length * 10);
      reasons.push(`共同语言: ${commonLangs.slice(0, 2).join(', ')}`);
    }
  }

  // 3. 兴趣领域匹配 (权重: 25分)
  if (user1.preferences?.interests && user2.preferences?.interests) {
    const interests1 = user1.preferences.interests.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const interests2 = user2.preferences.interests.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const commonInterests = interests1.filter((interest: string) =>
      interests2.some((i: string) => i.includes(interest) || interest.includes(i))
    );

    if (commonInterests.length > 0) {
      score += Math.min(25, commonInterests.length * 8);
      reasons.push(`共同兴趣: ${commonInterests.slice(0, 2).join(', ')}`);
    }
  }

  // 4. 参会目的匹配 (权重: 20分)
  if (user1.preferences?.purpose && user2.preferences?.purpose) {
    const purpose1 = user1.preferences.purpose.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const purpose2 = user2.preferences.purpose.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const commonPurpose = purpose1.filter((p: string) =>
      purpose2.some((p2: string) => p2.includes(p) || p.includes(p2))
    );

    if (commonPurpose.length > 0) {
      score += Math.min(20, commonPurpose.length * 10);
      reasons.push(`共同目的: ${commonPurpose.slice(0, 2).join(', ')}`);
    }
  }

  // 5. 行业背景匹配 (权重: 20分)
  if (user1.preferences?.industry_background && user2.preferences?.industry_background) {
    const industry1 = user1.preferences.industry_background.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const industry2 = user2.preferences.industry_background.toLowerCase().split(/[,，、]+/).map((s: string) => s.trim());
    const commonIndustry = industry1.filter((ind: string) =>
      industry2.some((i: string) => i.includes(ind) || ind.includes(i))
    );

    if (commonIndustry.length > 0) {
      score += Math.min(20, commonIndustry.length * 10);
      reasons.push(`相似行业: ${commonIndustry.slice(0, 2).join(', ')}`);
    } else {
      score += 5;
      reasons.push('跨界交流机会');
    }
  }

  if (reasons.length === 0) {
    score = 30;
    reasons.push('探索新朋友');
  }

  return {
    userId: user2.profile.user_id,
    nickname: user2.profile.nickname,
    gender: user2.profile.gender,
    ageGroup: user2.profile.age_group,
    score: Math.min(100, Math.round(score)),
    reasons,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { eventId } = await req.json()

    if (!eventId) {
      throw new Error('Event ID is required')
    }

    // 1. Get current user's profile and preferences
    const { data: currentProfile } = await supabaseClient
      .from('usr_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: currentPreferences } = await supabaseClient
      .from('usr_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const currentUser = {
      profile: currentProfile,
      preferences: currentPreferences,
    }

    // 2. Get checked-in users for this event
    // First get all sessions for this event
    const { data: sessions } = await supabaseClient
      .from('session_flows')
      .select('session_id')
      .eq('event_id', eventId)

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sessionIds = sessions.map((s) => s.session_id)

    // Get users who have checked in to any session in this event
    const { data: assignments } = await supabaseClient
      .from('evt_assignments')
      .select('user_id')
      .in('session_id', sessionIds)
      .eq('checked_in', true)

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const checkedInUserIds = [...new Set(assignments.map((a) => a.user_id))]

    // 3. Get existing matches
    const { data: existingMatches } = await supabaseClient
      .from('match_records')
      .select('user1_id, user2_id')
      .eq('event_id', eventId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

    const matchedUserIds = new Set<string>()
    existingMatches?.forEach((match) => {
      if (match.user1_id === user.id) {
        matchedUserIds.add(match.user2_id)
      } else {
        matchedUserIds.add(match.user1_id)
      }
    })

    // 4. Filter available users
    const availableUserIds = checkedInUserIds.filter(
      (id) => id !== user.id && !matchedUserIds.has(id)
    )

    if (availableUserIds.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Get profiles and preferences for available users
    const { data: profiles } = await supabaseClient
      .from('usr_profiles')
      .select('*')
      .in('user_id', availableUserIds)

    const { data: preferences } = await supabaseClient
      .from('usr_preferences')
      .select('*')
      .in('user_id', availableUserIds)

    // 6. Combine profiles and preferences
    const availableUsers = profiles?.map((profile) => ({
      profile,
      preferences: preferences?.find((pref) => pref.user_id === profile.user_id) || null,
    })) || []

    // 7. Calculate match scores
    const recommendations = availableUsers
      .map((user) => calculateMatchScore(currentUser, user))
      .sort((a, b) => b.score - a.score)

    return new Response(
      JSON.stringify({ recommendations }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
