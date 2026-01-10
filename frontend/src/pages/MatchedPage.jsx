/**
 * 参与者匹配/对话界面
 */

import { useEffect } from 'react'
import { useCountdown } from '../hooks/useCountdown'
import { useApp } from '../context/AppContext'
import './MatchedPage.css'

export const MatchedPage = () => {
  const { user, participantState } = useApp()
  const remainingSeconds = useCountdown(participantState.endsAt)

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--'
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="page matched-page">
      <div className="matched-container">
        {/* 倒计时 */}
        <div className="countdown-section">
          <div className={`countdown ${remainingSeconds <= 30 ? 'warning' : ''}`}>
            {formatTime(remainingSeconds)}
          </div>
          <p className="countdown-text">
            {remainingSeconds <= 30 ? '时间即将结束' : '对话时间'}
          </p>
        </div>

        {/* 配对信息 */}
        <div className="match-info">
          <h1>对话中</h1>
          <p className="partner-label">您的对话伙伴</p>
          <div className="partner-card">
            <div className="partner-avatar">👤</div>
            <p className="partner-name">{participantState.matchPartner || '加载中...'}</p>
          </div>

          {/* 提示 */}
          <div className="tips">
            <p>💡 尽可能了解对方的背景和兴趣</p>
            <p>💡 交换联系方式或社交媒体</p>
            <p>💡 预定下一步的交流方式</p>
          </div>
        </div>
      </div>
    </div>
  )
}
