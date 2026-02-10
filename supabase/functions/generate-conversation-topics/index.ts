import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Topic {
  category: 'icebreaker' | 'interests' | 'professional' | 'deep_talk';
  question: string;
  reasoning: string;
}

interface OpenAIMessage {
  role: 'system' | 'user';
  content: string;
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

    const { matchId } = await req.json()

    if (!matchId) {
      throw new Error('Match ID is required')
    }

    // 1. Verify user is part of this match
    const { data: match, error: matchError } = await supabaseClient
      .from('evt_matches')
      .select('*, user1_profile:usr_profiles!user1_id(*), user2_profile:usr_profiles!user2_id(*)')
      .eq('match_id', matchId)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Verify user is part of this match
    if (match.user1_id !== user.id && match.user2_id !== user.id) {
      throw new Error('Unauthorized to generate topics for this match')
    }

    // 2. Check rate limiting (1 generation per match per hour)
    const { data: canGenerate, error: rateLimitError } = await supabaseClient
      .rpc('can_generate_topics', { p_match_id: matchId })

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError)
    }

    if (!canGenerate) {
      // Get the last generation time to calculate cooldown
      const { data: lastTopic } = await supabaseClient
        .from('evt_conversation_topics')
        .select('generated_at')
        .eq('match_id', matchId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      const minutesRemaining = lastTopic
        ? Math.ceil((60 - (Date.now() - new Date(lastTopic.generated_at).getTime()) / 1000 / 60))
        : 60

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `You can generate new topics in ${minutesRemaining} minutes`,
          minutesRemaining,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      )
    }

    // 3. Get both users' preferences
    const { data: user1Preferences } = await supabaseClient
      .from('usr_preferences')
      .select('*')
      .eq('user_id', match.user1_id)
      .maybeSingle()

    const { data: user2Preferences } = await supabaseClient
      .from('usr_preferences')
      .select('*')
      .eq('user_id', match.user2_id)
      .maybeSingle()

    // 4. Build context for OpenAI
    const user1 = {
      nickname: match.user1_profile?.nickname || 'User 1',
      age_group: match.user1_profile?.age_group || 'Not specified',
      gender: match.user1_profile?.gender || 'Not specified',
      interests: user1Preferences?.interests || 'Not specified',
      languages: user1Preferences?.languages || 'Not specified',
      purpose: user1Preferences?.purpose || 'Not specified',
      industry: user1Preferences?.industry_background || 'Not specified',
    }

    const user2 = {
      nickname: match.user2_profile?.nickname || 'User 2',
      age_group: match.user2_profile?.age_group || 'Not specified',
      gender: match.user2_profile?.gender || 'Not specified',
      interests: user2Preferences?.interests || 'Not specified',
      languages: user2Preferences?.languages || 'Not specified',
      purpose: user2Preferences?.purpose || 'Not specified',
      industry: user2Preferences?.industry_background || 'Not specified',
    }

    // 5. Call OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `You are a conversation topic generator for an event networking platform.
Generate 5-7 conversation starter topics for two matched users based on their profiles.
Consider their common interests, backgrounds, languages, and purposes for attending.
Make topics engaging, thoughtful, and appropriate for a professional networking context.
Return ONLY a valid JSON array with no additional text, where each object has:
- category: one of "icebreaker", "interests", "professional", "deep_talk"
- question: the conversation starter question (string)
- reasoning: why this topic suits this pair (string)

Example format:
[
  {
    "category": "icebreaker",
    "question": "What brought you to this event today?",
    "reasoning": "A light opener to start the conversation"
  }
]`

    const userPrompt = `Generate conversation topics for these two users:

User 1: ${user1.nickname} (${user1.age_group}, ${user1.gender})
- Interests: ${user1.interests}
- Languages: ${user1.languages}
- Purpose: ${user1.purpose}
- Industry: ${user1.industry}

User 2: ${user2.nickname} (${user2.age_group}, ${user2.gender})
- Interests: ${user2.interests}
- Languages: ${user2.languages}
- Purpose: ${user2.purpose}
- Industry: ${user2.industry}

Generate 5-7 topics that would help them have an engaging conversation. Focus on their common ground and complementary differences.`

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI API error:', errorText)
      throw new Error('Failed to generate topics. Please try again.')
    }

    const openaiData = await openaiResponse.json()
    const topicsText = openaiData.choices[0]?.message?.content

    if (!topicsText) {
      throw new Error('No topics generated')
    }

    // Parse the JSON response
    let topics: Topic[]
    try {
      topics = JSON.parse(topicsText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', topicsText)
      throw new Error('Failed to parse generated topics')
    }

    // Validate topics structure
    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error('Invalid topics format')
    }

    // 6. Store topics in database
    const { data: storedTopic, error: storeError } = await supabaseClient
      .from('evt_conversation_topics')
      .insert({
        match_id: matchId,
        topics: topics,
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing topics:', storeError)
      throw new Error('Failed to save topics')
    }

    // 7. Return generated topics
    return new Response(
      JSON.stringify({
        topic_id: storedTopic.topic_id,
        match_id: matchId,
        topics: topics,
        generated_at: storedTopic.generated_at,
        created_at: storedTopic.created_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in generate-conversation-topics:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message.includes('Unauthorized') ? 401 : 500,
      }
    )
  }
})
