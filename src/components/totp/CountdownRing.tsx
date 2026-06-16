'use client'

import { useEffect, useState } from 'react'
import { getProgress, getSecondsRemaining } from '@/lib/totp'

interface CountdownRingProps {
  period?: number
  size?: number
  strokeWidth?: number
  onReset?: () => void
}

export function CountdownRing({ period = 30, size = 44, strokeWidth = 3, onReset }: CountdownRingProps) {
  const [progress, setProgress] = useState(getProgress(period))
  const [seconds, setSeconds] = useState(getSecondsRemaining(period))

  useEffect(() => {
    const tick = () => {
      const remaining = getSecondsRemaining(period)
      const newProgress = getProgress(period)
      if (remaining === period) onReset?.()
      setSeconds(remaining)
      setProgress(newProgress)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [period, onReset])

  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference
  const isUrgent = seconds <= 5

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={isUrgent ? 'text-red-500 transition-all duration-1000' : 'text-emerald-500 transition-all duration-1000'}
        />
      </svg>
      <span
        className={`absolute text-[11px] font-bold tabular-nums ${isUrgent ? 'text-red-500' : 'text-foreground'}`}
      >
        {seconds}
      </span>
    </div>
  )
}
