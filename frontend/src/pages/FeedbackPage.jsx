/**
 * 参与者反馈界面
 */

import { useState } from 'react'
import { participantApi } from '../api'
import { useApp } from '../context/AppContext'
import './FeedbackPage.css'

export const FeedbackPage = () => {
  const { user, participantState } = useApp()
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('请评分')
      return
    }

    setLoading(true)
    try {
      await participantApi.submitFeedback(
        user.participantId,
        participantState.roundId,
        participantState.matchPartner,
        rating,
        notes
      )
      setSubmitted(true)
    } catch (error) {
      alert('提交反馈失败，请重试')
      console.error('Feedback error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="page feedback-page">
        <div className="feedback-container">
          <div className="success-message">
            <h1>感谢您的反馈！</h1>
            <p>您的意见对我们改进很重要</p>
            <p className="loading-text">准备下一轮配对...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page feedback-page">
      <div className="feedback-container">
        <h1>对话反馈</h1>
        <p className="subtitle">请评价您与对方的对话体验</p>

        {/* 星级评分 */}
        <div className="rating-section">
          <p className="rating-label">您的评分</p>
          <div className="star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`star ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
              >
                ⭐
              </button>
            ))}
          </div>
          <p className="rating-text">{rating === 0 ? '请评分' : `${rating} 分`}</p>
        </div>

        {/* 备注 */}
        <div className="notes-section">
          <p className="notes-label">补充意见（可选）</p>
          <textarea
            placeholder="您有什么建议或想说的吗？"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="notes-input"
            maxLength="200"
          ></textarea>
          <p className="notes-count">{notes.length}/200</p>
        </div>

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || loading}
          className="button button-primary button-full"
        >
          {loading ? '提交中...' : '提交反馈'}
        </button>
      </div>
    </div>
  )
}
