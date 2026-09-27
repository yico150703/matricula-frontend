import { ArrowLeft, MailCheck, Send } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'
import AuthLayout from '../../components/AuthLayout'

export default function Recuperar() {
  const [usuario, setUsuario] = useState('')
  const [sending, setSending] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      setResultado(await authApi.recuperar(usuario.trim()))
    } catch (err) {
      setError(err.detail || 'No se pudo registrar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-form">
        <h2>Recuperar contraseña</h2>
        {resultado ? (
          <div className="recover-result">
            <MailCheck size={40} className="recover-icon" />
            {resultado.canal === 'correo' ? (
              <p>
                Te enviamos un enlace a <strong>{resultado.destino}</strong>. Ábrelo para crear una nueva contraseña (vence en
                30 minutos). Revisa también la carpeta de spam.
              </p>
            ) : (
              <p>
                Registramos tu solicitud. La <strong>Oficina de Matrícula</strong> la atenderá y te entregará un enlace o
                restablecerá tu contraseña a tu código de alumno. Acércate con tu DNI o escribe desde tu correo
                institucional.
              </p>
            )}
            <Link to="/login" className="btn-secondary btn-block">
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-form-inner">
            <p className="muted">
              Escribe tu código de alumno o tu correo institucional. Si tienes un correo registrado te enviaremos un enlace;
              si no, tu pedido llegará a la Oficina de Matrícula.
            </p>
            <label className="field">
              Código de alumno o correo
              <input value={usuario} onChange={(e) => setUsuario(e.target.value)} required autoFocus placeholder="Ej. 2024035025" />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="btn-primary btn-block" disabled={sending}>
              <Send size={16} /> {sending ? 'Enviando…' : 'Solicitar recuperación'}
            </button>
            <Link to="/login" className="auth-link">
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}
