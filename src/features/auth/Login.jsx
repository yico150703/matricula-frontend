import { useState } from 'react'
import { authApi } from '../../api/client'

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(''); setSending(true)
    try { const result = await authApi.login(email, password); onLoggedIn(result.alumno, result.access_token) }
    catch (err) { setError(err.detail || 'No fue posible iniciar sesión.') }
    finally { setSending(false) }
  }
  return <div className="login-layout"><section className="login-intro"><p className="eyebrow">UNFV · Ingeniería de Sistemas</p><h1>Tu matrícula, clara y a tiempo.</h1><p>Consulta tu avance, selecciona secciones y organiza tu horario en un solo lugar.</p></section><form className="login-card" onSubmit={submit}><h2>Iniciar sesión</h2><label>Correo institucional<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label><label>Contraseña<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}<button disabled={sending}>{sending ? 'Ingresando…' : 'Ingresar'}</button></form></div>
}
