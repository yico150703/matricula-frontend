import { useEffect, useRef, useState } from 'react'

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']

/** Cuenta regresiva que se reinicia con la actividad del usuario; al llegar a 0 ejecuta onExpire. */
export default function useInactivityTimer(active, totalSeconds, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)
  const deadline = useRef(Date.now() + totalSeconds * 1000)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    if (!active) return undefined
    deadline.current = Date.now() + totalSeconds * 1000
    setSecondsLeft(totalSeconds)

    let lastReset = 0
    const reset = () => {
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      deadline.current = now + totalSeconds * 1000
    }
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    const timer = setInterval(() => {
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(timer)
        expireRef.current?.()
      }
    }, 1000)

    return () => {
      clearInterval(timer)
      EVENTS.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [active, totalSeconds])

  return secondsLeft
}
