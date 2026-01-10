/**
 * 主持人控制台
 */

import { useState, useEffect } from 'react'
import { hostApi } from '../api'
import { useApp } from '../context/AppContext'
import './HostConsole.css'

export const HostConsole = () => {
  const { event, updateEvent } = useApp()
  const [roundDuration, setRoundDuration] = useState(120) // 默认 2 分钟
  const [loading, setLoading] = useState(false)
  const [eventStatus, setEventStatus] = useState(null)
  const [participants, setParticipants] = useState([])

  // 刷新事件状态
  const refreshStatus = async () => {
    try {
      const status = await hostApi.getEventStatus(event.eventId)
      setEventStatus(status)
      const participantList = await hostApi.getParticipants(event.eventId)
      setParticipants(participantList.participants || [])
    } catch (error) {
      console.error('Refresh status error:', error)
    }
  }

  // 定时刷新
  useEffect(() => {
    if (!event.eventId) return
    refreshStatus()
    const interval = setInterval(refreshStatus, 5000)
    return () => clearInterval(interval)
  }, [event.eventId])

  // 开始轮次
  const handleStartRound = async () => {
    setLoading(true)
    try {
      const result = await hostApi.startRound(event.eventId, roundDuration)
      updateEvent({
        currentRoundId: result.round_id,
        currentRoundStatus: 'ACTIVE'
      })
      await refreshStatus()
    } catch (error) {
      alert('开始轮次失败')
      console.error('Start round error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 结束轮次
  const handleEndRound = async () => {
    if (!event.currentRoundId) return
    setLoading(true)
    try {
      await hostApi.endRound(event.eventId, event.currentRoundId)
      updateEvent({ currentRoundStatus: 'ENDED', currentRoundId: null })
      await refreshStatus()
    } catch (error) {
      alert('结束轮次失败')
      console.error('End round error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 暂停轮次
  const handlePauseRound = async () => {
    if (!event.currentRoundId) return
    setLoading(true)
    try {
      await hostApi.pauseRound(event.eventId, event.currentRoundId)
      updateEvent({ currentRoundStatus: 'PAUSED' })
      await refreshStatus()
    } catch (error) {
      alert('暂停轮次失败')
      console.error('Pause round error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 恢复轮次
  const handleResumeRound = async () => {
    if (!event.currentRoundId) return
    setLoading(true)
    try {
      await hostApi.resumeRound(event.eventId, event.currentRoundId)
      updateEvent({ currentRoundStatus: 'ACTIVE' })
      await refreshStatus()
    } catch (error) {
      alert('恢复轮次失败')
      console.error('Resume round error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="host-console">
      <div className="console-header">
        <h1>主持人控制台</h1>
        <p className="event-id">Event ID: {event.eventId}</p>
      </div>

      {/* 统计信息 */}
      <div className="stats-section">
        <div className="stat-card">
          <p className="stat-label">总参与人数</p>
          <p className="stat-value">{eventStatus?.participant_count || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">在线人数</p>
          <p className="stat-value">{eventStatus?.online_count || 0}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">当前轮次</p>
          <p className="stat-value">{event.currentRoundId ? `${event.currentRoundStatus}` : '未开始'}</p>
        </div>
      </div>

      {/* 轮次控制 */}
      <div className="control-section">
        <h2>轮次管理</h2>

        {event.currentRoundStatus === 'IDLE' ? (
          <div className="duration-control">
            <label>
              轮次时长（秒）:
              <input
                type="number"
                value={roundDuration}
                onChange={(e) => setRoundDuration(parseInt(e.target.value))}
                disabled={loading}
                min="30"
                max="600"
              />
            </label>
            <button
              onClick={handleStartRound}
              disabled={loading}
              className="button button-primary"
            >
              {loading ? '开始中...' : '开始轮次'}
            </button>
          </div>
        ) : (
          <div className="active-round-controls">
            <p className="round-status">轮次状态: <strong>{event.currentRoundStatus}</strong></p>
            <div className="button-group">
              {event.currentRoundStatus === 'ACTIVE' && (
                <>
                  <button onClick={handlePauseRound} disabled={loading} className="button">
                    暂停
                  </button>
                  <button onClick={handleEndRound} disabled={loading} className="button button-danger">
                    结束
                  </button>
                </>
              )}
              {event.currentRoundStatus === 'PAUSED' && (
                <>
                  <button onClick={handleResumeRound} disabled={loading} className="button button-primary">
                    恢复
                  </button>
                  <button onClick={handleEndRound} disabled={loading} className="button button-danger">
                    结束
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 参与者列表 */}
      <div className="participants-section">
        <h2>参与者列表</h2>
        <div className="participants-list">
          {participants.length === 0 ? (
            <p className="empty-message">暂无参与者</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>名字</th>
                  <th>状态</th>
                  <th>在线</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.participant_id}>
                    <td>{p.participant_id.substr(0, 8)}...</td>
                    <td>{p.name}</td>
                    <td>{p.ui_state}</td>
                    <td>{p.is_online ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
