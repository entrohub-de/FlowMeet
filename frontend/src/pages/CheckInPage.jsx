/**
 * 参与者签到界面
 */

import { useState } from 'react'
import { participantApi } from '../api'
import { useApp } from '../context/AppContext'
import './CheckInPage.css'

export const CheckInPage = ({ eventId }) => {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { setCurrentUser, updateParticipantState } = useApp()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await participantApi.checkin(eventId, name)
      setCurrentUser(response.participant_id, name)
      // 更新参与者状态为 WAITING
      updateParticipantState({ uiState: response.ui_state })
    } catch (err) {
      setError('签到失败，请重试')
      console.error('CheckIn error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page checkin-page">
      <div className="container">
        <h1>欢迎来到 FlowMeet</h1>
        <p className="subtitle">专业的线下 Networking 活动管理系统</p>

        <form onSubmit={handleSubmit} className="checkin-form">
          <input
            type="text"
            placeholder="请输入您的名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            className="input"
            required
          />

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="button button-primary"
          >
            {loading ? '签到中...' : '签到'}
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  )
}
