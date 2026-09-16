import { useEffect, useState } from 'react'

export default function TopBar({
  alumno,
  onLogout,
  onToggleMenu,
  onOpenDiagramaER,
  onOpenAlumnos,
  onOpenNotas,
}) {
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

  const nombreCompleto =
    alumno && alumno.apellidos && alumno.nombres
      ? `${alumno.apellidos.toUpperCase()}, ${alumno.nombres.toUpperCase()}`
      : alumno?.nombres || alumno?.cod_alumno || 'ESTUDIANTE'

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
        {/* Acceso directo a Asignar Notas y Prerrequisitos */}
        <button
          type="button"
          onClick={onOpenNotas}
          title="Asignar calificaciones (>= 11 aprobado, <= 10 desaprobado) y validar prerrequisitos"
          style={{
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s',
            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
          }}
        >
          🎯 Calificaciones / Notas
        </button>

        {/* Acceso directo a Diagrama E-R (Estilo Foto) */}
        <button
          type="button"
          onClick={onOpenDiagramaER}
          title="Ver Diagrama Entidad-Relación Oficial (Con Verbos)"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s',
          }}
        >
          📊 Diagrama E-R
        </button>

        {/* Acceso a Agregar / Gestionar Alumnos en BD */}
        <button
          type="button"
          onClick={onOpenAlumnos}
          title="Agregar Alumnos a la Base de Datos PostgreSQL"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '0.4rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.2s',
          }}
        >
          👥 Alumnos
        </button>

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
