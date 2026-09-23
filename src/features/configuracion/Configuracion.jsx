import { useState } from 'react'
import { authApi } from '../../api/client'
import { planPorId } from '../../utils/academico'
import PasswordForm from './PasswordForm'

function Dato({ label, value }) {
  return (
    <div className="dato">
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  )
}

export default function Configuracion({ user, rol, onUserUpdated }) {
  const isAdmin = rol === 'admin'
  const [form, setForm] = useState(
    isAdmin
      ? { nombres: user.nombres || '', email: user.email || '' }
      : { email_personal: user.email_personal || '', telefono: user.telefono || '' },
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const res = await authApi.actualizarPerfil(form)
      onUserUpdated(res.usuario)
      setMsg({ ok: true, text: 'Datos guardados correctamente.' })
    } catch (err) {
      setMsg({ ok: false, text: err.detail || 'No se pudieron guardar los datos.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">Mi cuenta</p>
          <h2>Configuración</h2>
        </div>
      </div>

      <div className="config-grid">
        <article className="panel-card">
          <h3>{isAdmin ? 'Datos del administrador' : 'Datos académicos'}</h3>
          {isAdmin ? (
            <div className="datos-grid">
              <Dato label="Usuario" value={user.usuario} />
              <Dato label="Rol" value="Administrador" />
            </div>
          ) : (
            <>
              <div className="datos-grid">
                <Dato label="Código" value={user.cod_alumno} />
                <Dato label="Estudiante" value={`${user.nombres} ${user.apellidos}`} />
                <Dato label="Correo institucional" value={user.email} />
                <Dato label="Plan de estudios" value={planPorId(user.id_plan).nombre} />
                <Dato label="Escuela" value={user.escuela} />
                <Dato label="Fecha de ingreso" value={user.fecha_ingreso} />
              </div>
              <p className="muted small">
                Estos datos solo pueden ser modificados por la Oficina de Matrícula. Si hay un error, comunícate con el
                administrador.
              </p>
            </>
          )}
        </article>

        <article className="panel-card">
          <h3>{isAdmin ? 'Perfil' : 'Datos de contacto'}</h3>
          <form className="form-grid" onSubmit={saveProfile}>
            {isAdmin ? (
              <>
                <label className="field">
                  Nombre visible
                  <input name="nombres" value={form.nombres} onChange={change} required />
                </label>
                <label className="field">
                  Correo de contacto
                  <input name="email" type="email" value={form.email} onChange={change} />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  Correo personal (opcional)
                  <input name="email_personal" type="email" value={form.email_personal} onChange={change} placeholder="tucorreo@gmail.com" />
                </label>
                <label className="field">
                  Teléfono / celular (opcional)
                  <input name="telefono" value={form.telefono} onChange={change} placeholder="987 654 321" inputMode="tel" />
                </label>
              </>
            )}
            {msg && <p className={`${msg.ok ? 'form-success' : 'form-error'} full`}>{msg.text}</p>}
            <div className="form-actions full">
              <button className="btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar datos'}
              </button>
            </div>
          </form>
        </article>

        <article className="panel-card config-wide">
          <h3>Seguridad · Cambiar contraseña</h3>
          <p className="muted small">
            Usa al menos 6 caracteres. {isAdmin ? '' : 'No puede ser igual a tu código de alumno. '}La sesión se cierra
            automáticamente tras 15 minutos sin actividad.
          </p>
          <PasswordForm codigo={user.cod_alumno} onChanged={onUserUpdated} />
        </article>
      </div>
    </section>
  )
}
