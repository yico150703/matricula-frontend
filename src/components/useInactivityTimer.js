import { useEffect, useRef, useState } from 'react'
import { session } from '../api/client'

/** Segundos que le quedan al token actual (el servidor fija el vencimiento al iniciar sesión). */
function segundosDelToken() {
  try {
    const payload = JSON.parse(atob(session.get().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return Math.max(0, Math.round(payload.exp - Date.now() / 1000))
  } catch {
    return null
  }
}

/** Tiempo FIJO de sesión del alumno: cuenta desde que ingresó y NO se reinicia con clics ni movimientos
 *  (tampoco al recargar la página). Al llegar a 0 ejecuta onExpire. Para el personal no se usa. */
export default function useSessionCountdown(active, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null)
      return undefined
    }
    const tick = () => {
      const left = segundosDelToken()
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(timer)
        expireRef.current?.()
      }
    }
    const timer = setInterval(tick, 1000)
    tick()
    return () => clearInterval(timer)
  }, [active])

  return secondsLeft
}
