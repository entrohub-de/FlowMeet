/**
 * Realtime 事件订阅 Hook
 * 管理 SSE 连接和事件处理
 */

import { useEffect, useCallback, useRef } from 'react'
import { realtimeApi } from '../api'
import { useApp } from '../context/AppContext'

export const useRealtime = () => {
  const { user, updateParticipantState, updateEvent, setRealtimeConnected } = useApp()
  const eventSourceRef = useRef(null)

  // 处理事件
  const handleEvent = useCallback((event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('Realtime Event:', data)

      switch (data.type) {
        case 'MATCH_ASSIGNED':
          // 配对分配
          updateParticipantState({
            uiState: 'MATCHED',
            roundId: data.data.round_id,
            matchPartner: data.data.partner_id,
            endsAt: data.data.ends_at
          })
          break

        case 'ROUND_STARTED':
          // 轮次开始
          updateEvent({
            currentRoundId: data.data.round_id,
            currentRoundStatus: 'ACTIVE'
          })
          break

        case 'ROUND_ENDED':
          // 轮次结束
          updateParticipantState({
            uiState: 'FEEDBACK'
          })
          updateEvent({
            currentRoundStatus: 'ENDED'
          })
          break

        case 'ROUND_ENDING_SOON':
          // 轮次即将结束（预警）
          break

        case 'RECOVER_STATE':
          // 状态恢复（掉线重连）
          updateParticipantState(data.data)
          break

        case 'EVENT_STATUS_CHANGED':
          // 事件状态变更
          updateEvent(data.data)
          break

        default:
          console.warn('Unknown event type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing realtime event:', error)
    }
  }, [updateParticipantState, updateEvent])

  // 订阅事件
  useEffect(() => {
    if (!user.participantId) return

    try {
      const eventSource = realtimeApi.subscribeEvents(user.participantId)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('Realtime connected')
        setRealtimeConnected(true)
      }

      eventSource.onmessage = handleEvent

      eventSource.onerror = (error) => {
        console.error('Realtime connection error:', error)
        setRealtimeConnected(false)

        // 自动重连
        eventSource.close()
        setTimeout(() => {
          // 重新订阅
        }, 5000)
      }

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          setRealtimeConnected(false)
        }
      }
    } catch (error) {
      console.error('Failed to subscribe realtime:', error)
    }
  }, [user.participantId, handleEvent, setRealtimeConnected])

  return {
    connected: eventSourceRef.current?.readyState === EventSource.OPEN
  }
}
