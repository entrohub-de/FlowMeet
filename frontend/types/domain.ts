/**
 * Domain Types - 核心业务实体定义
 */

export interface Event {
  event_id: string;
  venue_id: string | null;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  created_at: string;
  checkin_code?: string | null;
  checkin_qr_enabled?: boolean;
  venue?: Venue;
}

export interface Venue {
  venue_id: string;
  name: string;
  capacity: number;
  created_at: string;
}

export interface Stage {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Poll {
  id: string;
  eventId: string;
  stageId?: string;
  question: string;
  options: string[];
  results?: Record<string, number>;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  eventId: string;
  stageId?: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  createdBy: string;
}

export interface Presence {
  id: string;
  eventId: string;
  userId: string;
  stageId?: string;
  status: 'online' | 'offline';
  lastSeen: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'host' | 'participant' | 'admin';
  createdAt: string;
}

export interface Profile {
  id: number;
  created_at: string;
  user_id: string;
  nickname: string | null;
  gender: string | null;
  age_group: string | null;
}

export interface Preferences {
  id: number;
  created_at: string;
  user_id: string;
  languages: string | null;
  interests: string | null;
  purpose: string | null;
  industry_background: string | null;
}

export interface Expectation {
  expectation_id: string;
  event_id: string;
  user_id: string;
  content: string;
  status: 'active' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Match {
  match_id: string;
  event_id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  created_at: string;
  updated_at: string;
  user1_location: string | null;
  user2_location: string | null;
  location_updated_by_user1_at: string | null;
  location_updated_by_user2_at: string | null;
  user1_profile?: Profile;
  user2_profile?: Profile;
}

export interface MatchPreference {
  preference_id: string;
  event_id: string;
  user_id: string;
  preferred_topics: string | null;
  availability: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  group_id: string;
  event_id: string;
  session_id: string | null;
  name: string;
  description: string | null;
  max_size: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  member_id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
}

export type TopicCategory = 'icebreaker' | 'interests' | 'professional' | 'deep_talk';

export interface Topic {
  category: TopicCategory;
  question: string;
  reasoning: string;
}

export interface ConversationTopic {
  topic_id: string;
  match_id: string;
  topics: Topic[];
  generated_at: string;
  created_at: string;
}

export interface EventRating {
  rating_id: string;
  event_id: string;
  user_id: string;
  overall_score: number;
  organization_score: number | null;
  venue_score: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchRating {
  rating_id: string;
  match_id: string;
  rater_user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchQualityRating {
  rating_id: string;
  event_id: string;
  user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface TopicRating {
  rating_id: string;
  topic_id: string;
  user_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}
