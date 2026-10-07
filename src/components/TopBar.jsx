import { Inbox, LogOut, Menu, Settings, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BUZON_EVENT, buzonApi } from '../api/client'
import logo from '../assets/logo-unfv.png'

const formatTimer = (total) => {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TopBar({ user, rol, onLogout, onToggleMenu, secondsLeft }) {
  const navigate = useNavigate()
  const esAlumno = rol === 'alumno'
  const nombre = !esAlumno
    ? [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || user?.usuario
    : user?.apellidos && user?.nombres
      ? `${user.apellidos.toUpperCase()}, ${user.nombres.toUpperCase()}`
      : user?.cod_alumno
  const lowTime = secondsLeft !== null && secondsLeft <= 60
  const location = useLocation()
  const [noLeidos, setNoLeidos] = useState(0)

  // Mensajes sin leer del buzón: al entrar, al cambiar de pantalla y cada minuto
  useEffect(() => {
    if (!esAlumno) return undefined
    const consultar = () => buzonApi.noLeidos().then((r) => setNoLeidos(r.no_leidos)).catch(() => {})
    consultar()
    const t = setInterval(consultar, 60000)
    const onCambio = (e) => setNoLeidos(e.detail)
    window.addEventListener(BUZON_EVENT, onCambio)
    return () => {
      clearInterval(t)
      window.removeEventListener(BUZON_EVENT, onCambio)
    }
  }, [esAlumno, location.pathname])

  return (
    <header className="unfv-topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-menu-btn" onClick={onToggleMenu} aria-label="Abrir menú" title="Menú">
          <Menu size={22} />
        </button>
        <span className="topbar-logo">
          <img src={logo} alt="UNFV" />
        </span>
        <span className="topbar-title">Matrícula FIIS</span>
      </div>

      <div className="topbar-right">
        <span className={`role-chip ${esAlumno ? 'role-alumno' : 'role-admin'} role-${rol}`}>{esAlumno ? 'Alumno' : user?.rol_nombre || 'Administrador'}</span>

        {esAlumno && secondsLeft !== null && (
          <div className={`topbar-timer ${lowTime ? 'timer-low' : ''}`} title="Tiempo restante de tu sesión">
            <Timer size={15} /> {formatTimer(secondsLeft)}
          </div>
        )}

        {esAlumno && (
          <button type="button" className={`topbar-buzon ${location.pathname === '/buzon' ? 'activo' : ''}`} onClick={() => navigate('/buzon')} title="Buzón" aria-label={`Buzón${noLeidos ? `, ${noLeidos} sin leer` : ''}`}>
            <Inbox size={18} />
            {noLeidos > 0 && <span className="topbar-buzon-badge">{noLeidos > 9 ? '9+' : noLeidos}</span>}
          </button>
        )}

        <button type="button" className="topbar-user" onClick={() => navigate('/configuracion')} title="Configuración de cuenta">
          <span className="topbar-user-name">{nombre}</span> <Settings size={16} />
        </button>

        <button type="button" className="topbar-logout-btn" onClick={onLogout} title="Cerrar sesión">
          <LogOut size={16} /> <span className="hide-sm">Salir</span>
        </button>
      </div>
    </header>
  )
}
