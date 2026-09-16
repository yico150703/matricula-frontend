import { useEffect, useState } from 'react'

export default function TopBar({ alumno, onLogout, onToggleMenu }) {
  // Temporizador de 15 minutos en cuenta regresiva como en las capturas (00:14:59)
  const [secondsLeft, setSecondsLeft] = useState(15 * 60)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const nombreCompleto = alumno
    ? `${alumno.apellidos.toUpperCase()}, ${alumno.nombres.toUpperCase()}`
    : 'ESTUDIANTE'

  return (
    <header className="unfv-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onToggleMenu}
          aria-label="Abrir menú"
          title="Menú"
        >
          <span className="hamburger-icon">☰</span>
        </button>
      </div>

      <div className="topbar-right">
        <div className="topbar-timer" title="Tiempo restante de sesión">
          {formatTimer(secondsLeft)}
        </div>

        <div className="topbar-user">
          <span>{nombreCompleto} ▾</span>
        </div>

        <button
          type="button"
          className="topbar-logout-btn"
          onClick={onLogout}
          title="Cerrar sesión"
        >
          <span className="power-icon">⏻</span> Salir
        </button>
      </div>
    </header>
  )
}
