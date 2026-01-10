/**
 * 主应用入口
 */

import { useState, useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { useRealtime } from './hooks/useRealtime'
import { CheckInPage } from './pages/CheckInPage'
import { WaitingPage } from './pages/WaitingPage'
import { MatchedPage } from './pages/MatchedPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { HostConsole } from './pages/HostConsole'
import './App.css'

function AppContent() {
  const { user, participantState, event, setCurrentUser } = useApp()
  const [eventId] = useState('event_' + Date.now()) // 简化处理

  // 从 URL 参数检查是否是主持人模式
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const role = params.get('role')
    if (role === 'host') {
      setCurrentUser('host', 'Host', 'HOST')
    }
  }, [setCurrentUser])

  // 订阅实时事件
  useRealtime()

  // 根据用户类型和状态选择页面
  const renderPage = () => {
    // 主持人
    if (user.type === 'HOST') {
      return <HostConsole />
    }

    // 参与者 - 根据 uiState 显示相应页面
    if (!user.participantId) {
      return <CheckInPage eventId={eventId} />
    }

    switch (participantState.uiState) {
      case 'CHECKIN':
        return <CheckInPage eventId={eventId} />
      case 'WAITING':
      case 'PAUSED':
        return <WaitingPage />
      case 'MATCHED':
      case 'ENDING':
        return <MatchedPage />
      case 'FEEDBACK':
        return <FeedbackPage />
      default:
        return <WaitingPage />
    }
  }

  return (
    <div className="app">
      {renderPage()}
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
