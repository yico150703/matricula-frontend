import { useState } from 'react'
import { authApi } from '../../api/client'

const MIN = 6

function strength(pwd) {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  return ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'][score]
}

/** Formulario reutilizable para cambiar contraseña (primer ingreso y configuración). */
export default function PasswordForm({ codigo, onChanged, submitLabel = 'Actualizar contraseña' }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (nueva.length < MIN) return setError(`La nueva contraseña debe tener al menos ${MIN} caracteres.`)
    if (nueva !== confirmar) return setError('La confirmación no coincide con la nueva contraseña.')
    if (codigo && nueva === codigo) return setError('La nueva contraseña no puede ser tu código de alumno.')
    if (nueva === actual) return setError('La nueva contraseña debe ser diferente a la actual.')
    setSaving(true)
    try {
      const res = await authApi.cambiarPassword(actual, nueva)
      setActual('')
      setNueva('')
      setConfirmar('')
      setOk('Contraseña actualizada correctamente.')
      onChanged?.(res.usuario)
    } catch (err) {
      setError(err.detail || 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  const type = show ? 'text' : 'password'
  return (
    <form className="form-grid" onSubmit={submit}>
      <label className="field">
        Contraseña actual
        <input type={type} value={actual} onChange={(e) => setActual(e.target.value)} required autoComplete="current-password" />
      </label>
      <label className="field">
        Nueva contraseña
        <input type={type} value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={MIN} autoComplete="new-password" />
        {nueva && <small className="field-hint">Seguridad: {strength(nueva)}</small>}
      </label>
      <label className="field">
        Confirmar nueva contraseña
        <input type={type} value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
      </label>
      <label className="check-inline">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseñas
      </label>
      {error && <p className="form-error full">{error}</p>}
      {ok && <p className="form-success full">{ok}</p>}
      <div className="form-actions full">
        <button className="btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
