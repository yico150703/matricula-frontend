import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'

export default function Restablecer() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [estado, setEstado] = useState('validando') // validando | valido | invalido | listo
  const [info, setInfo] = useState(null)
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return setEstado('invalido')
    authApi
      .validarToken(token)
      .then((r) => {
        setInfo(r)
        setEstado('valido')
      })
      .catch((err) => {
        setError(err.detail)
        setEstado('invalido')
      })
  }, [token])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (nueva.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (nueva !== confirmar) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    try {
      await authApi.restablecer(token, nueva)
      setEstado('listo')
    } catch (err) {
      setError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form">
        <h2>Nueva contraseña</h2>
        {estado === 'validando' && <p className="muted">Verificando enlace…</p>}
        {estado === 'invalido' && (
          <>
            <p className="form-error">{error || 'El enlace no es válido o ya venció.'}</p>
            <Link to="/recuperar" className="btn-primary btn-block">
              Solicitar un nuevo enlace
            </Link>
          </>
        )}
        {estado === 'valido' && (
          <form onSubmit={submit} className="auth-form-inner">
            <p className="muted">
              Cuenta: <strong>{info?.usuario}</strong>. Elige una contraseña de al menos 6 caracteres
              {info?.rol === 'alumno' ? ' que no sea tu código' : ''}.
            </p>
            <label className="field">
              Nueva contraseña
              <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required autoComplete="new-password" />
            </label>
            <label className="field">
              Confirmar contraseña
              <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn-primary btn-block" disabled={saving}>
              <KeyRound size={16} /> {saving ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
        {estado === 'listo' && (
          <div className="recover-result">
            <CheckCircle2 size={40} className="recover-icon ok" />
            <p>Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>
            <Link to="/login" className="btn-primary btn-block">
              <ArrowLeft size={16} /> Ir al inicio de sesión
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
