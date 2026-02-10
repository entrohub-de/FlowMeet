-- Test Data for Matching Feature
-- This migration adds test data to demonstrate the matching and location features

-- Note: You need to replace the user_id values with actual user IDs from your auth.users table
-- To get user IDs, run: SELECT id, email FROM auth.users;

-- Insert test event (if not exists)
INSERT INTO public.evt_events (event_id, name, description, start_time, end_time, venue_id)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '测试配对活动',
  '这是一个用于测试配对功能的活动',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours',
  NULL
)
ON CONFLICT (event_id) DO NOTHING;

-- Create test session for the event
INSERT INTO public.evt_sessions (session_id, event_id, name, start_time, end_time)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  '测试场次',
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 hours'
)
ON CONFLICT (session_id) DO NOTHING;

-- Instructions for manual setup:
-- 1. Create two test user accounts through the app's signup page
-- 2. Get their user IDs by running: SELECT id, email FROM auth.users;
-- 3. Replace USER_ID_1 and USER_ID_2 below with actual IDs
-- 4. Uncomment and run the following commands:

/*
-- Replace these with actual user IDs
DO $$
DECLARE
  user_id_1 UUID := 'USER_ID_1'; -- Replace with actual user ID
  user_id_2 UUID := 'USER_ID_2'; -- Replace with actual user ID
  event_id UUID := '11111111-1111-1111-1111-111111111111';
  session_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Create user profiles
  INSERT INTO public.usr_profiles (user_id, nickname, gender, age_group)
  VALUES
    (user_id_1, '测试用户A', 'male', '25-34'),
    (user_id_2, '测试用户B', 'female', '25-34')
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    gender = EXCLUDED.gender,
    age_group = EXCLUDED.age_group;

  -- Create user preferences
  INSERT INTO public.usr_preferences (user_id, languages, interests, purpose, industry_background)
  VALUES
    (user_id_1, '中文,英文', '技术,创业', '社交,学习', '互联网'),
    (user_id_2, '中文,英文', '设计,创业', '社交,合作', '互联网')
  ON CONFLICT (user_id) DO UPDATE SET
    languages = EXCLUDED.languages,
    interests = EXCLUDED.interests,
    purpose = EXCLUDED.purpose,
    industry_background = EXCLUDED.industry_background;

  -- Register users for the event
  INSERT INTO public.evt_assignments (session_id, user_id, checked_in)
  VALUES
    (session_id, user_id_1, true),
    (session_id, user_id_2, true)
  ON CONFLICT (session_id, user_id) DO UPDATE SET
    checked_in = true;

  -- Create match records with different statuses

  -- Match 1: Accepted (with location data)
  INSERT INTO public.evt_matches (
    match_id,
    event_id,
    user1_id,
    user2_id,
    status,
    user1_location,
    user2_location,
    location_updated_by_user1_at,
    location_updated_by_user2_at
  )
  VALUES (
    gen_random_uuid(),
    event_id,
    user_id_1,
    user_id_2,
    'accepted',
    '咖啡区靠窗位置',
    '二楼休息区沙发',
    NOW() - INTERVAL '5 minutes',
    NOW() - INTERVAL '2 minutes'
  )
  ON CONFLICT DO NOTHING;

  -- Match 2: Pending (no location data yet)
  -- Uncomment if you want to test pending status
  -- INSERT INTO public.evt_matches (event_id, user1_id, user2_id, status)
  -- VALUES (event_id, user_id_2, user_id_1, 'pending');

END $$;
*/

-- After running the above, you should see:
-- 1. An event called "测试配对活动"
-- 2. Two user profiles with nicknames
-- 3. An accepted match between the two users
-- 4. Location data showing where each user is located

COMMENT ON TABLE public.evt_matches IS 'Updated to include location fields for helping users find each other at events';
