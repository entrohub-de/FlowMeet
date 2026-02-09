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
