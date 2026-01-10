/**
 * 倒计时 Hook
 * 客户端计算倒计时，基于 ends_at 时间戳
 */

import { useState, useEffect } from 'react'

export const useCountdown = (endsAt) => {
  const [remaining, setRemaining] = useState(null)

  useEffect(() => {
    if (!endsAt) {
      setRemaining(null)
      return
    }

    const updateCountdown = () => {
      const now = new Date().getTime()
      const endTime = new Date(endsAt).getTime()
      const diff = Math.max(0, endTime - now)

      setRemaining(Math.ceil(diff / 1000)) // 秒数

      if (diff <= 0) {
        setRemaining(0)
      }
    }

    updateCountdown()

    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [endsAt])

  return remaining
}
