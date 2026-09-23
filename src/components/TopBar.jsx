import { useNavigate } from 'react-router-dom'

const formatTimer = (total) => {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TopBar({ user, rol, onLogout, onToggleMenu, secondsLeft }) {
  const navigate = useNavigate()
  const isAdmin = rol === 'admin'
  const nombre = isAdmin
    ? user?.nombres || user?.usuario
    : user?.apellidos && user?.nombres
      ? `${user.apellidos.toUpperCase()}, ${user.nombres.toUpperCase()}`
      : user?.cod_alumno
  const lowTime = secondsLeft <= 60

  return (
    <header className="unfv-topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu-btn" onClick={onToggleMenu} aria-label="Abrir menú" title="Menú">
          <span className="hamburger-icon">☰</span>
        </button>
        <span className="topbar-title">Matrícula UNFV · FIIS</span>
      </div>

      <div className="topbar-right">
        <span className={`role-chip ${isAdmin ? 'role-admin' : 'role-alumno'}`}>{isAdmin ? 'Administrador' : 'Alumno'}</span>

        <div
          className={`topbar-timer ${lowTime ? 'timer-low' : ''}`}
          title="La sesión se cierra tras 15 minutos sin actividad"
        >
          ⏱ {formatTimer(secondsLeft)}
        </div>

        <button type="button" className="topbar-user" onClick={() => navigate('/configuracion')} title="Configuración de cuenta">
          <span className="topbar-user-name">{nombre}</span> ⚙️
        </button>

        <button type="button" className="topbar-logout-btn" onClick={onLogout} title="Cerrar sesión">
          <span className="power-icon">⏻</span> <span className="hide-sm">Salir</span>
        </button>
      </div>
    </header>
  )
}
