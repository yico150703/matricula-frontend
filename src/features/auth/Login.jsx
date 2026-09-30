import { Building2, CalendarRange, Eye, EyeOff, GraduationCap, KeyRound, LogIn, ShieldCheck, UserCheck, Users } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'

// Cuentas de prueba (las crea el script de base de datos). Se muestran al inicio del login.
const CUENTAS_PRUEBA = [
  { rol: 'Administrador del sistema', usuario: 'adminprueba', clave: 'Admin2026!', icon: ShieldCheck },
  { rol: 'Jefe de Departamento', usuario: 'jefedepartamentoescuelasistemas@unfv.edu.pe', clave: 'Jefe2026!', icon: CalendarRange },
  { rol: 'Director de Escuela', usuario: 'directorescuelasistemas@unfv.edu.pe', clave: 'Director2026!', icon: UserCheck },
  { rol: 'Asistente de Escuela', usuario: 'asistenteescuelasistemas@unfv.edu.pe', clave: 'Asistente2026!', icon: Building2 },
  { rol: 'Docente', usuario: 'jalvaradot@unfv.edu.pe', clave: 'Docente2026!', icon: Users },
  { rol: 'Alumno', usuario: '20260001', clave: '20260001', icon: GraduationCap }
]

// Poner VITE_MOSTRAR_CUENTAS_PRUEBA=false en Vercel cuando el sistema pase a uso real
const MOSTRAR_CUENTAS = import.meta.env.VITE_MOSTRAR_CUENTAS_PRUEBA !== 'false'

function CuentasPrueba({ onUsar }) {
  return (
    <div className="demo-accounts">
      <div className="demo-accounts-head">
        <KeyRound size={15} /> Cuentas de prueba · toca una para completar
      </div>
      <ul>
        {CUENTAS_PRUEBA.map(({ rol, usuario, clave, icon: Icon }) => (
          <li key={usuario}>
            <button type="button" onClick={() => onUsar(usuario, clave)}>
              <Icon size={16} />
              <span>
                <b>{rol}</b>
                <small title={usuario}>{usuario}</small>
                <small>
                  Clave: <code>{clave}</code>
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="demo-accounts-note">
        Son cuentas compartidas: su contraseña no se puede cambiar, así todos pueden entrar. Las cuentas reales piden cambiar la contraseña al primer
        ingreso.
      </p>
    </div>
  )
}

export default function Login({ onLoggedIn, onOpenDiagramaER, notice }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [lento, setLento] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    // El servidor gratuito se duerme sin uso: el primer ingreso puede tardar hasta un minuto
    const aviso = setTimeout(() => setLento(true), 4000)
    try {
      const result = await authApi.login(usuario.trim(), password)
      onLoggedIn(result.usuario || result.alumno, result.rol || 'alumno', result.access_token)
    } catch (err) {
      setError(err.detail || 'No fue posible iniciar sesión.')
    } finally {
      clearTimeout(aviso)
      setLento(false)
      setSending(false)
    }
  }

  return (
    <AuthLayout onOpenDiagramaER={onOpenDiagramaER}>
      <form className="auth-form" onSubmit={submit}>
        {MOSTRAR_CUENTAS && (
          <CuentasPrueba
            onUsar={(u, c) => {
              setUsuario(u)
              setPassword(c)
              setError('')
            }}
          />
        )}
        <h2>Iniciar sesión</h2>
        {notice && <p className="form-notice">{notice}</p>}
        <label className="field">
          Correo, código de alumno o usuario
          <input
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            placeholder="Ej. 2024035025 o nombre@unfv.edu.pe"
            autoFocus
          />
        </label>
        <label className="field">
          Contraseña
          <div className="password-field">
            <input
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {error && <p className="form-error">{error}</p>}
        {lento && (
          <p className="form-notice" role="status">
            Activando el servidor… el primer ingreso del día puede tardar hasta un minuto. No cierres la página.
          </p>
        )}
        <button type="submit" disabled={sending} className="btn-primary btn-block">
          <LogIn size={18} /> {sending ? 'Ingresando…' : 'Ingresar'}
        </button>
        <Link to="/recuperar" className="auth-link">
          ¿Olvidaste tu contraseña?
        </Link>
        <div className="login-help">
          <strong>¿Primer ingreso?</strong> Tu usuario y tu contraseña inicial son tu <b>código de alumno</b>. El sistema
          te pedirá cambiarla al entrar.
        </div>
      </form>
    </AuthLayout>
  )
}
