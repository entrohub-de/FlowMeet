/**
 * 参与者等待界面
 */

import { useEffect, useState } from 'react'
import { participantApi } from '../api'
import { useApp } from '../context/AppContext'
import './WaitingPage.css'

export const WaitingPage = () => {
  const { user, event, participantState } = useApp()
  const [pulse, setPulse] = useState(true)

  // 定期心跳
  useEffect(() => {
    const interval = setInterval(() => {
      participantApi.heartbeat(user.participantId, event.eventId).catch(err => {
        console.error('Heartbeat error:', err)
      })
    }, 15000) // 15 秒心跳

    return () => clearInterval(interval)
  }, [user.participantId, event.eventId])

  // 脉冲动画
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(prev => !prev)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="page waiting-page">
      <div className="waiting-container">
        <div className={`pulse ${pulse ? 'active' : ''}`}></div>
        <h1>等待配对中...</h1>
        <p className="user-info">欢迎，{user.name}</p>
        <p className="connecting-text">
          {participantState.uiState === 'WAITING'
            ? '我们正在为您匹配最合适的对话伙伴'
            : '连接中...'}
        </p>
      </div>
    </div>
  )
}
