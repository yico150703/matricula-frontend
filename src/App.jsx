import { useCallback, useEffect, useState } from 'react'
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardPen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Network,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
  X
} from 'lucide-react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { SESSION_EXPIRED_EVENT, authApi, session } from './api/client'
import TopBar from './components/TopBar'
import useInactivityTimer from './components/useInactivityTimer'
import AdminAlumnos from './features/admin/AdminAlumnos'
import AdminDashboard from './features/admin/AdminDashboard'
import AdminNotas from './features/admin/AdminNotas'
import AdminPersonal from './features/admin/AdminPersonal'
import CambioPasswordObligatorio from './features/auth/CambioPasswordObligatorio'
import Login from './features/auth/Login'
import Recuperar from './features/auth/Recuperar'
import Restablecer from './features/auth/Restablecer'
import Configuracion from './features/configuracion/Configuracion'
import DiagramaERModal from './features/diagrama/DiagramaERModal'
import Historial from './features/historial/Historial'
import Horario from './features/horario/Horario'
import Dashboard from './features/malla/Dashboard'
import Matricula from './features/matricula/Matricula'
import DocenteHorario from './features/proceso/DocenteHorario'
import FaseBar from './features/proceso/FaseBar'
import { ProcesoProvider } from './features/proceso/ProcesoContext'
import Programacion from './features/proceso/Programacion'
import Solicitudes from './features/proceso/Solicitudes'
import { planPorId } from './utils/academico'

// OWASP recomienda cerrar por inactividad entre 2-5 min (alto riesgo) y 15-30 min (bajo riesgo).
// Para una sesión de matrícula se usa un punto intermedio: 10 minutos.
export const INACTIVIDAD_SEGUNDOS = 10 * 60

// Roles que participan en el proceso de horarios: ven la barra de fases arriba
const ROLES_PROCESO = ['jefe', 'director', 'asistente', 'docente']

// Pantalla de inicio de cada rol
const INICIO = {
  alumno: '/matricula',
  admin: '/admin',
  jefe: '/programacion',
  director: '/programacion',
  asistente: '/programacion',
  docente: '/docente'
}

const TITULO_MENU = {
  alumno: 'Ingeniería de Sistemas',
  admin: 'Administración del sistema',
  jefe: 'Jefatura de Departamento',
  director: 'Dirección de Escuela',
  asistente: 'Asistencia de Escuela',
  docente: 'Portal docente'
}

// Cada rol ve solo las opciones de su función
const NAV = {
  alumno: [
    ['/matricula', 'Registro de matrícula', ClipboardPen],
    ['/malla', 'Mi malla curricular', Network],
    ['/horario', 'Mi horario', CalendarDays],
    ['/historial', 'Historial académico', ScrollText],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ],
  admin: [
    ['/admin', 'Panel de control', LayoutDashboard],
    ['/admin/personal', 'Personal y roles', ShieldCheck],
    ['/admin/alumnos', 'Gestión de alumnos', Users],
    ['/admin/notas', 'Calificaciones', Target],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ],
  jefe: [
    ['/programacion', 'Programación de horarios', CalendarRange],
    ['/solicitudes', 'Solicitudes de cambio', MessagesSquare],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ],
  director: [
    ['/programacion', 'Asignación de docentes', UserCheck],
    ['/solicitudes', 'Solicitudes de cambio', MessagesSquare],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ],
  asistente: [
    ['/programacion', 'Asignación de aulas', Building2],
    ['/solicitudes', 'Solicitudes de cambio', MessagesSquare],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ],
  docente: [
    ['/docente', 'Mi horario docente', CalendarDays],
    ['/solicitudes', 'Mis reportes', MessagesSquare],
    ['/configuracion', 'Configuración de cuenta', Settings]
  ]
}

function Rutas({ user, rol, onUserUpdated }) {
  const configuracion = <Route path="/configuracion" element={<Configuracion user={user} rol={rol} onUserUpdated={onUserUpdated} />} />
  const otra = <Route path="*" element={<Navigate to={INICIO[rol] || '/'} replace />} />

  if (rol === 'admin') {
    return (
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/personal" element={<AdminPersonal />} />
        <Route path="/admin/alumnos" element={<AdminAlumnos />} />
        <Route path="/admin/notas" element={<AdminNotas />} />
        {configuracion}
        {otra}
      </Routes>
    )
  }
  if (rol === 'docente') {
    return (
      <Routes>
        <Route path="/docente" element={<DocenteHorario user={user} />} />
        <Route path="/solicitudes" element={<Solicitudes user={user} />} />
        {configuracion}
        {otra}
      </Routes>
    )
  }
  if (ROLES_PROCESO.includes(rol)) {
    return (
      <Routes>
        <Route path="/programacion" element={<Programacion user={user} />} />
        <Route path="/solicitudes" element={<Solicitudes user={user} />} />
        {configuracion}
        {otra}
      </Routes>
    )
  }
  return (
    <Routes>
      <Route path="/matricula" element={<Matricula alumno={user} />} />
      <Route path="/malla" element={<Dashboard alumno={user} />} />
      <Route path="/horario" element={<Horario alumno={user} />} />
      <Route path="/historial" element={<Historial alumno={user} />} />
      {configuracion}
      {otra}
    </Routes>
  )
}

function Shell({ user, rol, onLogout, onUserUpdated, secondsLeft }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [diagramaOpen, setDiagramaOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const isAdmin = rol === 'admin'
  const enProceso = ROLES_PROCESO.includes(rol)

  const contenido = (
    <div className="unfv-app-layout">
      <TopBar user={user} rol={rol} onLogout={onLogout} onToggleMenu={() => setMenuOpen((v) => !v)} secondsLeft={secondsLeft} />

      {menuOpen && <div className="drawer-backdrop" onClick={closeMenu} />}
      <aside className={`unfv-drawer ${menuOpen ? 'open' : ''}`} aria-hidden={!menuOpen}>
        <div className="drawer-header">
          <div className="drawer-brand">
            <GraduationCap size={26} className="drawer-brand-icon" />
            <span className="drawer-brand-sub">UNFV · FIIS</span>
            <strong>{TITULO_MENU[rol]}</strong>
          </div>
          <button type="button" className="drawer-close-btn" onClick={closeMenu} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        </div>

        <nav className="drawer-nav">
          {(NAV[rol] || []).map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Icon size={19} className="nav-icon" />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <button
              type="button"
              className="drawer-nav-item drawer-nav-button"
              onClick={() => {
                closeMenu()
                setDiagramaOpen(true)
              }}
            >
              <BookOpenCheck size={19} className="nav-icon" />
              <span className="nav-label">Diagrama E-R</span>
            </button>
          )}
        </nav>

        <div className="drawer-footer">
          <div className="drawer-student-info">
            {rol === 'alumno' ? (
              <>
                <span className="student-badge-status">● Alumno</span>
                <small>Código: {user.cod_alumno}</small>
                <small>{planPorId(user.id_plan).nombre}</small>
              </>
            ) : (
              <>
                <span className="student-badge-status">● {user.rol_nombre || 'Administrador'}</span>
                <small>{user.email || user.usuario}</small>
              </>
            )}
          </div>
          <button type="button" className="drawer-logout-btn" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="unfv-main-content">
        {enProceso && <FaseBar />}
        <Rutas user={user} rol={rol} onUserUpdated={onUserUpdated} />
      </main>

      <DiagramaERModal isOpen={diagramaOpen} onClose={() => setDiagramaOpen(false)} />
    </div>
  )

  // El estado del proceso (período y fase) se comparte entre la barra de fases y las pantallas del personal
  return enProceso ? <ProcesoProvider>{contenido}</ProcesoProvider> : contenido
}

export default function App() {
  const [auth, setAuth] = useState(null) // { user, rol }
  const [checking, setChecking] = useState(true)
  const [diagramaOpen, setDiagramaOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  const logout = useCallback(
    (message = '') => {
      session.clear()
      setAuth(null)
      setNotice(typeof message === 'string' ? message : '')
      navigate('/login', { replace: true })
    },
    [navigate]
  )

  // Restaurar la sesión al recargar la página
  useEffect(() => {
    if (!session.get()) {
      setChecking(false)
      return
    }
    authApi
      .me()
      .then((res) => setAuth({ user: res.usuario || res.alumno, rol: res.rol || 'alumno' }))
      .catch(() => session.clear())
      .finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    const onExpired = () => logout('Tu sesión expiró. Vuelve a iniciar sesión.')
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [logout])

  const secondsLeft = useInactivityTimer(Boolean(auth), INACTIVIDAD_SEGUNDOS, () => logout('Se cerró la sesión por 10 minutos de inactividad.'))

  const loggedIn = (user, rol, token) => {
    session.set(token)
    setNotice('')
    setAuth({ user, rol })
    navigate(INICIO[rol] || '/', { replace: true })
  }

  const updateUser = (user) => setAuth((prev) => (prev ? { ...prev, user } : prev))

  if (checking) return <div className="centered">Comprobando sesión…</div>

  if (!auth) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login onLoggedIn={loggedIn} notice={notice} onOpenDiagramaER={() => setDiagramaOpen(true)} />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/restablecer" element={<Restablecer />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <DiagramaERModal isOpen={diagramaOpen} onClose={() => setDiagramaOpen(false)} />
      </>
    )
  }

  if (auth.user?.debe_cambiar_password) {
    return <CambioPasswordObligatorio user={auth.user} rol={auth.rol} onDone={updateUser} onLogout={() => logout()} />
  }

  return <Shell user={auth.user} rol={auth.rol} onLogout={() => logout()} onUserUpdated={updateUser} secondsLeft={secondsLeft} />
}
