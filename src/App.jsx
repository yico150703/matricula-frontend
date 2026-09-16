import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi } from './api/client'
import TopBar from './components/TopBar'
import Login from './features/auth/Login'
import Historial from './features/historial/Historial'
import Horario from './features/horario/Horario'
import Dashboard from './features/malla/Dashboard'
import Matricula from './features/matricula/Matricula'

const navItems = [
  ['/matricula', 'Registro de Matrícula', '📝'],
  ['/malla', 'Mi Malla Curricular', '🗺️'],
  ['/horario', 'Mi Horario', '📅'],
  ['/historial', 'Historial Académico', '📜'],
]

function Shell({ alumno, onLogout, onAlumnoUpdated }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const toggleMenu = () => setMenuOpen((prev) => !prev)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="unfv-app-layout">
      {/* Barra superior oficial UNFV (Temporizador, Usuario, Salir) */}
      <TopBar alumno={alumno} onLogout={onLogout} onToggleMenu={toggleMenu} />

      {/* Menú lateral desplegable (Drawer) */}
      {menuOpen && <div className="drawer-backdrop" onClick={closeMenu} />}
      <aside className={`unfv-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-brand">
            <span className="drawer-brand-sub">UNFV · FIEI</span>
            <strong>Ingeniería de Sistemas</strong>
          </div>
          <button type="button" className="drawer-close-btn" onClick={closeMenu}>
            ✕
          </button>
        </div>

        <nav className="drawer-nav">
          {navItems.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <span className="nav-icon">{icon}</span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="drawer-footer">
          <div className="drawer-student-info">
            <span className="student-badge-status">● Matrícula Habilitada</span>
            <small>Código: {alumno.cod_alumno}</small>
            <small>Plan: {alumno.plan?.nombre || 'Ing. de Sistemas'}</small>
          </div>
          <button type="button" className="drawer-logout-btn" onClick={onLogout}>
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área principal de contenido */}
      <main className="unfv-main-content">
        <Routes>
          <Route
            path="/matricula"
            element={<Matricula alumno={alumno} onAlumnoUpdated={onAlumnoUpdated} />}
          />
          <Route path="/malla" element={<Dashboard alumno={alumno} />} />
          <Route path="/horario" element={<Horario alumno={alumno} />} />
          <Route path="/historial" element={<Historial alumno={alumno} />} />
          <Route path="/" element={<Navigate to="/matricula" replace />} />
          <Route path="*" element={<Navigate to="/matricula" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [alumno, setAlumno] = useState(null)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('matricula_token')) {
      return setChecking(false)
    }
    authApi
      .me()
      .then(({ alumno: profile }) => setAlumno(profile))
      .catch(() => localStorage.removeItem('matricula_token'))
      .finally(() => setChecking(false))
  }, [])

  const loggedIn = (profile, token) => {
    localStorage.setItem('matricula_token', token)
    setAlumno(profile)
    navigate('/matricula')
  }

  const logout = () => {
    localStorage.removeItem('matricula_token')
    setAlumno(null)
    navigate('/login')
  }

  const handleAlumnoUpdated = (updatedAlumno) => {
    setAlumno(updatedAlumno)
  }

  if (checking) return <div className="centered">Comprobando sesión…</div>
  if (!alumno) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoggedIn={loggedIn} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return <Shell alumno={alumno} onLogout={logout} onAlumnoUpdated={handleAlumnoUpdated} />
}
