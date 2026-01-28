/**
 * Domain Types - 核心业务实体定义
 */

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
