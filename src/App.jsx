import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { authApi } from './api/client'
import Login from './features/auth/Login'
import Dashboard from './features/malla/Dashboard'
import Matricula from './features/matricula/Matricula'
import Horario from './features/horario/Horario'
import Historial from './features/historial/Historial'

const navItems = [['/', 'Mi malla'], ['/matricula', 'Matrícula'], ['/horario', 'Mi horario'], ['/historial', 'Historial']]

function Shell({ alumno, onLogout }) {
  return <div className="app-shell"><aside><div className="brand"><small>UNFV · EPIS</small><strong>Matrícula</strong></div><nav>{navItems.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav><button className="link-button" onClick={onLogout}>Cerrar sesión</button></aside><main><header><div><p className="eyebrow">Sistema de matrícula</p><h1>Hola, {alumno.nombres}</h1></div><span className="plan-chip">{alumno.plan.nombre}</span></header><Routes><Route path="/" element={<Dashboard alumno={alumno} />} /><Route path="/matricula" element={<Matricula alumno={alumno} />} /><Route path="/horario" element={<Horario alumno={alumno} />} /><Route path="/historial" element={<Historial alumno={alumno} />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div>
}

export default function App() {
  const [alumno, setAlumno] = useState(null)
  const [checking, setChecking] = useState(true)
  const navigate = useNavigate()
  useEffect(() => {
    if (!localStorage.getItem('matricula_token')) return setChecking(false)
    authApi.me().then(({ alumno: profile }) => setAlumno(profile)).catch(() => localStorage.removeItem('matricula_token')).finally(() => setChecking(false))
  }, [])
  const loggedIn = (profile, token) => { localStorage.setItem('matricula_token', token); setAlumno(profile); navigate('/') }
  const logout = () => { localStorage.removeItem('matricula_token'); setAlumno(null); navigate('/login') }
  if (checking) return <div className="centered">Comprobando sesión…</div>
  if (!alumno) return <Routes><Route path="/login" element={<Login onLoggedIn={loggedIn} />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>
  return <Shell alumno={alumno} onLogout={logout} />
}
