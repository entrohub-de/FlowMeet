/**
 * Realtime 事件类型定义
 */

export interface EventLivePayload {
  type: 'announcement' | 'poll' | 'stage_change' | 'presence';
  data: Record<string, any>;
  timestamp: string;
}

export interface PresenceUpdate {
  type: 'presence';
  userId: string;
  status: 'online' | 'offline';
  count: number;
}

export interface AnnouncementPayload {
  type: 'announcement';
  id: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PollPayload {
  type: 'poll';
  id: string;
  question: string;
  options: string[];
}

export type RealtimePayload = EventLivePayload | PresenceUpdate | AnnouncementPayload | PollPayload;
