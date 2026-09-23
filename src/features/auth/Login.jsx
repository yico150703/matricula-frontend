import { useState } from 'react'
import { authApi } from '../../api/client'
import unfvLogo from '../../assets/logo-unfv.png'

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
    <div className="login-wrapper">
      <header className="login-top-logo-bar">
        <img src={unfvLogo} alt="Universidad Nacional Federico Villarreal" className="unfv-official-logo" />
      </header>

      <div className="login-layout">
        <section className="login-intro">
          <p className="eyebrow">UNFV · FIIS · E.P. Ingeniería de Sistemas</p>
          <h1>Sistema de Matrícula UNFV</h1>
          <p>
            Consulta tu avance curricular, selecciona secciones con horarios y docentes, y organiza tu matrícula
            académica en un solo lugar.
          </p>
          {onOpenDiagramaER && (
            <div>
              <button type="button" className="btn-ghost-light" onClick={onOpenDiagramaER}>
                📊 Ver Diagrama Entidad-Relación
              </button>
            </div>
          )}
        </section>

        <form className="login-card" onSubmit={submit}>
          <div style={{ textAlign: 'center' }}>
            <img src={unfvLogo} alt="" className="login-card-mini-logo" />
          </div>
          <h2>Iniciar sesión</h2>

          {notice && <p className="form-notice">{notice}</p>}

          <label>
            Código de alumno o usuario
            <input
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              placeholder="Ej. 2023012345 o 2023012345@unfv.edu.pe"
              autoFocus
            />
          </label>
          <label>
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
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button disabled={sending} className="btn-primary login-submit">
            {sending ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="login-help">
            <strong>¿Primer ingreso?</strong> Tu usuario y tu contraseña inicial son tu <b>código de alumno</b>. El
            sistema te pedirá cambiar la contraseña al entrar. Si la olvidaste, solicita el restablecimiento a la Oficina
            de Matrícula.
          </div>
        </form>
      </div>
    </div>
  )
}
