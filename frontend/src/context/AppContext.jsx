/**
 * 全局状态管理
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  // 用户信息
  const [user, setUser] = useState({
    participantId: localStorage.getItem('participantId') || null,
    name: localStorage.getItem('participantName') || null,
    type: 'PARTICIPANT' // PARTICIPANT or HOST
  })

  // 事件信息
  const [event, setEvent] = useState({
    eventId: null,
    status: 'IDLE', // IDLE, ACTIVE
    currentRoundId: null,
    currentRoundStatus: 'IDLE'
  })

  // 参与者状态
  const [participantState, setParticipantState] = useState({
    uiState: 'CHECKIN', // CHECKIN, WAITING, MATCHED, ENDING, FEEDBACK, PAUSED
    roundId: null,
    matchPartner: null,
    endsAt: null
  })

  // 实时连接
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // 设置用户
  const setCurrentUser = useCallback((participantId, name, type = 'PARTICIPANT') => {
    setUser({ participantId, name, type })
    localStorage.setItem('participantId', participantId)
    localStorage.setItem('participantName', name)
  }, [])

  // 更新事件
  const updateEvent = useCallback((newEvent) => {
    setEvent(prev => ({ ...prev, ...newEvent }))
  }, [])

  // 更新参与者状态
  const updateParticipantState = useCallback((newState) => {
    setParticipantState(prev => ({ ...prev, ...newState }))
  }, [])

  const value = {
    user,
    setCurrentUser,
    event,
    updateEvent,
    participantState,
    updateParticipantState,
    realtimeConnected,
    setRealtimeConnected
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
