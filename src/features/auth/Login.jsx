import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'

export default function Login({ onLoggedIn, onOpenDiagramaER, notice }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    try {
      const result = await authApi.login(usuario.trim(), password)
      onLoggedIn(result.usuario || result.alumno, result.rol || 'alumno', result.access_token)
    } catch (err) {
      setError(err.detail || 'No fue posible iniciar sesión.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout onOpenDiagramaER={onOpenDiagramaER}>
      <form className="auth-form" onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        {notice && <p className="form-notice">{notice}</p>}
        <label className="field">
          Código de alumno o usuario
          <input
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoComplete="username"
            placeholder="Ej. 2024035025"
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
        <button disabled={sending} className="btn-primary btn-block">
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
