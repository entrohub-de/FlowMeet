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
  cover_image?: string | null;
  venue?: Venue;
}

export interface Venue {
  venue_id: string;
  name: string;
  capacity: number;
  address: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export type AreaType = 'meeting_room' | 'lounge' | 'cafe' | 'stage' | 'general';

export interface Area {
  area_id: string;
  event_id: string;
  name: string;
  description: string | null;
  max_people: number;
  min_people: number;
  area_order: number;
  area_type: AreaType;
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
  avatar_url?: string | null;
}

export interface Preferences {
  id: number;
  created_at: string;
  user_id: string;
  /** Comma-separated language codes (chinese, english, german, etc.) */
  languages: string | null;
  /** Comma-separated interest topics (startup, tech_ai, career, cross_cultural, etc.) */
  interests: string | null;
  /** Comma-separated professional roles (engineer, founder, marketing_sales, etc.) */
  industry_background: string | null;
  /** Single value: not_started | idea | seed | growth | mature | not_entrepreneur */
  startup_stage: string | null;
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

export interface ExpectationTemplate {
  template_id: string;
  user_id: string;
  name: string;
  tags: string[];
  text: string;
  created_at: string;
  updated_at: string;
}

export interface Match {
  match_id: string;
  event_id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  active_module_id: string | null;
  created_at: string;
  updated_at: string;
  user1_location: string | null;
  user2_location: string | null;
  location_updated_by_user1_at: string | null;
  location_updated_by_user2_at: string | null;
  user1_area_id: string | null;
  user2_area_id: string | null;
  user1_profile?: Profile;
  user2_profile?: Profile;
}

export interface MatchWithScore extends Match {
  match_score: number | null;
  match_reasons: string[] | null;
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

export type FlowStepStatus = 'pending' | 'active' | 'paused' | 'completed';

export interface ActiveFlowStep {
  id: string;
  title: string;
  duration: number;
  status: FlowStepStatus;
  remainingSeconds: number;
  pairingMode?: 'group' | '1v1';
}

export interface ActiveFlow {
  id: string;
  event_id: string;
  template_id: string | null;
  template_name: string;
  flow_status: 'idle' | 'running' | 'paused' | 'completed';
  steps: ActiveFlowStep[];
  active_step_id: string | null;
  active_step_started_at: string | null;
  active_step_remaining_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  is_globally_paused?: boolean;
  global_pause_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Signup {
  signup_id: string;
  event_id: string;
  user_id: string;
  status: 'active' | 'cancelled';
  created_at: string;
  checked_in: boolean;
  checked_in_at?: string;
  signup_timestamp?: string;
  profile?: Profile;
  expectation?: Expectation;
}

export type HostActionType =
  | 'flow_applied' | 'step_started' | 'step_paused' | 'step_resumed' | 'step_completed'
  | 'flow_paused' | 'flow_resumed' | 'flow_completed' | 'flow_reset'
  | 'matching_triggered' | 'grouping_triggered'
  | 'manual_pair' | 'manual_unpair' | 'manual_regroup'
  | 'global_pause' | 'global_resume';

export interface HostAction {
  action_id: string;
  event_id: string;
  host_user_id: string;
  action_type: HostActionType;
  target_step_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export type ActiveModuleStatus = 'active' | 'completed' | 'cancelled';

export interface ActiveModule {
  id: string;
  event_id: string;
  step_id: string;
  module_type: string;
  status: ActiveModuleStatus;
  round_number: number;
  ready_count: number;
  paired_count: number;
  unpaired_user_ids: string[];
  avg_match_score: number | null;
  started_at: string;
  completed_at: string | null;
  started_by: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type ParticipantStatus = 'checkin' | 'waiting' | 'ready' | 'matched' | 'in_conversation' | 'feedback';

export interface ParticipantState {
  id: string;
  event_id: string;
  user_id: string;
  flow_step_id: string | null;
  participant_status: ParticipantStatus;
  current_match_id: string | null;
  current_group_id: string | null;
  last_heartbeat_at: string;
  last_connected_at: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
}
