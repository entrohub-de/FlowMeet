/**
 * API 客户端
 * 封装所有 HTTP 请求
 */

import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 可以添加认证 token 等
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const participantApi = {
  // 签到
  checkin: (eventId, name) =>
    api.post('/participant/checkin', {
      event_id: eventId,
      participant_id: generateParticipantId(),
      name
    }),

  // 获取状态
  getState: (participantId, eventId) =>
    api.get(`/participant/state/${participantId}`, {
      params: { event_id: eventId }
    }),

  // 提交反馈
  submitFeedback: (participantId, roundId, partnerId, rating, notes) =>
    api.post('/participant/feedback', {
      participant_id: participantId,
      round_id: roundId,
      partner_id: partnerId,
      rating,
      notes
    }),

  // 心跳
  heartbeat: (participantId, eventId) =>
    api.post('/participant/heartbeat', null, {
      params: {
        participant_id: participantId,
        event_id: eventId
      }
    })
}

export const hostApi = {
  // 开始轮次
  startRound: (eventId, durationSeconds) =>
    api.post('/host/round/start', {
      event_id: eventId,
      duration_seconds: durationSeconds
    }),

  // 结束轮次
  endRound: (eventId, roundId) =>
    api.post('/host/round/end', {
      event_id: eventId,
      round_id: roundId
    }),

  // 暂停轮次
  pauseRound: (eventId, roundId) =>
    api.post('/host/round/pause', {
      event_id: eventId,
      round_id: roundId
    }),

  // 恢复轮次
  resumeRound: (eventId, roundId) =>
    api.post('/host/round/resume', {
      event_id: eventId,
      round_id: roundId
    }),

  // 获取事件状态
  getEventStatus: (eventId) =>
    api.get(`/host/event/${eventId}/status`),

  // 获取参与者列表
  getParticipants: (eventId) =>
    api.get(`/host/event/${eventId}/participants`)
}

export const realtimeApi = {
  // 订阅 SSE 事件
  subscribeEvents: (clientId) => {
    return new EventSource(`${API_BASE_URL}/realtime/events/${clientId}`)
  }
}

// 生成参与者 ID（本地）
function generateParticipantId() {
  return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export default api
