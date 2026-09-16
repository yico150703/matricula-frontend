import { useState } from 'react'
import { authApi } from '../../api/client'

export default function Login({ onLoggedIn, onOpenAlumnos, onOpenDiagramaER }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSending(true)
    try {
      const result = await authApi.login(email, password)
      onLoggedIn(result.alumno, result.access_token)
    } catch (err) {
      setError(err.detail || 'No fue posible iniciar sesión.')
    } finally {
      setSending(false)
    }
  }

  const handleFill = (userEmail, userPass) => {
    setEmail(userEmail)
    setPassword(userPass)
  }

  return (
    <div className="login-layout">
      <section className="login-intro">
        <p className="eyebrow">UNFV · FIIS · E.P. Ingeniería de Sistemas</p>
        <h1>Tu matrícula, clara y a tiempo.</h1>
        <p>Consulta tu avance curricular, selecciona secciones con horarios y docentes, y organiza tu matrícula académica en un solo lugar.</p>
        
        {onOpenDiagramaER && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onOpenDiagramaER}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              📊 Ver Diagrama Entidad-Relación (DER)
            </button>
          </div>
        )}
      </section>

      <form className="login-card" onSubmit={submit}>
        <h2>Iniciar sesión</h2>
        <label>
          Correo institucional
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="alumno@unfv.edu.pe"
          />
        </label>
        <label>
          Contraseña
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button disabled={sending} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
          {sending ? 'Ingresando…' : 'Ingresar'}
        </button>

        {/* Acceso rápido a registro de alumnos en BD */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
          <button
            type="button"
            onClick={onOpenAlumnos}
            style={{
              background: 'none',
              border: 'none',
              color: '#0284c7',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            ➕ ¿Nuevo estudiante? Agregar alumno a la Base de Datos
          </button>
        </div>

        {/* Credenciales de demostración */}
        <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#334155' }}>
            Estudiantes disponibles para prueba rápida:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span
              style={{ cursor: 'pointer', color: '#0284c7' }}
              onClick={() => handleFill('alumno@unfv.edu.pe', 'Cambiar123!')}
              title="Click para autocompletar"
            >
              👉 <strong>Ana Pérez</strong>: <code>alumno@unfv.edu.pe</code> / <code>Cambiar123!</code>
            </span>
            <span
              style={{ cursor: 'pointer', color: '#0284c7' }}
              onClick={() => handleFill('cgomez@unfv.edu.pe', 'Password123!')}
              title="Click para autocompletar"
            >
              👉 <strong>Carlos Gómez</strong>: <code>cgomez@unfv.edu.pe</code> / <code>Password123!</code>
            </span>
          </div>
        </div>
      </form>
    </div>
  )
}

