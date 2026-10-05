import { Ban, Check, CheckCircle2, ClipboardList, Copy, KeyRound, Pencil, RefreshCcw, Search, Target, UserCheck, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { PLANES, correoInstitucional, planPorId } from '../../utils/academico'

const EMPTY = { cod_alumno: '', nombres: '', apellidos: '', id_plan: 1 }

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* portapapeles no disponible */
    }
  }
  return (
    <button type="button" className="btn-secondary btn-sm" onClick={copy}>
      {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
    </button>
  )
}

function EditarAlumnoModal({ alumno, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombres: alumno.nombres,
    apellidos: alumno.apellidos,
    id_plan: alumno.id_plan,
    estado: alumno.estado,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.name === 'id_plan' ? Number(e.target.value) : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await adminApi.actualizarAlumno(alumno.cod_alumno, form)
      onSaved(res.alumno, 'Datos del alumno actualizados.')
    } catch (err) {
      setError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            Editar alumno <span>{alumno.cod_alumno}</span>
          </h3>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <form className="modal-body form-grid" onSubmit={submit}>
          <label className="field">
            Nombres
            <input name="nombres" value={form.nombres} onChange={change} required />
          </label>
          <label className="field">
            Apellidos
            <input name="apellidos" value={form.apellidos} onChange={change} required />
          </label>
          <label className="field">
            Plan curricular
            <select name="id_plan" value={form.id_plan} onChange={change}>
              {PLANES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            {form.id_plan !== alumno.id_plan && (
              <small className="field-hint warn">Las notas registradas en el otro plan no se considerarán para prerrequisitos.</small>
            )}
          </label>
          <label className="field">
            Estado
            <select name="estado" value={form.estado} onChange={change}>
              <option value="activo">Activo (puede ingresar y matricularse)</option>
              <option value="inactivo">Inactivo (no puede ingresar)</option>
            </select>
          </label>
          {error && <p className="form-error full">{error}</p>}
          <div className="form-actions full">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminAlumnos() {
  const navigate = useNavigate()
  const [alumnos, setAlumnos] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [creado, setCreado] = useState(null)
  const [query, setQuery] = useState('')
  const [editando, setEditando] = useState(null)
  const [confirmReset, setConfirmReset] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    setError(null)
    adminApi
      .alumnos()
      .then((res) => setAlumnos(res.alumnos || []))
      .catch(setError)
  }, [])
  useEffect(load, [load])

  const change = (e) => {
    const { name, value } = e.target
    setForm((f) => ({
      ...f,
      [name]: name === 'id_plan' ? Number(value) : name === 'cod_alumno' ? value.replace(/\D/g, '').slice(0, 12) : value,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setCreado(null)
    if (form.cod_alumno.length < 6) return setFormError('El código debe tener entre 6 y 12 dígitos.')
    setSaving(true)
    try {
      const res = await adminApi.crearAlumno(form)
      setCreado({ alumno: res.alumno, credenciales: res.credenciales })
      setForm((f) => ({ ...EMPTY, id_plan: f.id_plan }))
      setAlumnos((list) => [...(list || []), res.alumno].sort((x, y) => x.cod_alumno.localeCompare(y.cod_alumno)))
    } catch (err) {
      setFormError(err.detail)
    } finally {
      setSaving(false)
    }
  }

  const replaceAlumno = (alumno, text) => {
    setAlumnos((list) => list.map((a) => (a.cod_alumno === alumno.cod_alumno ? alumno : a)))
    setEditando(null)
    if (text) setMsg({ ok: true, text })
  }

  const resetPassword = async (al) => {
    setConfirmReset(null)
    try {
      const res = await adminApi.resetPassword(al.cod_alumno)
      replaceAlumno(res.alumno, res.message)
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  const toggleEstado = async (al) => {
    try {
      const res = await adminApi.actualizarAlumno(al.cod_alumno, { estado: al.estado === 'activo' ? 'inactivo' : 'activo' })
      replaceAlumno(res.alumno, `Alumno ${al.cod_alumno} ${res.alumno.estado === 'activo' ? 'activado' : 'desactivado'}.`)
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return alumnos || []
    return (alumnos || []).filter((a) =>
      [a.cod_alumno, a.nombres, a.apellidos, a.email].some((v) => String(v || '').toLowerCase().includes(q)),
    )
  }, [alumnos, query])

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Gestión de alumnos</h2>
        </div>
      </div>

      <article className="panel-card">
        <h3>
          <UserPlus size={19} /> Registrar nuevo alumno
        </h3>
        <form className="form-grid form-grid-4" onSubmit={submit}>
          <label className="field">
            Código de alumno *
            <input name="cod_alumno" value={form.cod_alumno} onChange={change} required inputMode="numeric" placeholder="Ej. 2023012345" />
          </label>
          <label className="field">
            Nombres *
            <input name="nombres" value={form.nombres} onChange={change} required placeholder="Ej. Renzo Paolo" />
          </label>
          <label className="field">
            Apellidos *
            <input name="apellidos" value={form.apellidos} onChange={change} required placeholder="Ej. Navarro Salazar" />
          </label>
          <label className="field">
            Plan curricular *
            <select name="id_plan" value={form.id_plan} onChange={change}>
              {PLANES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.corto}
                  {p.vigente ? ' · vigente' : ' · anterior'}
                </option>
              ))}
            </select>
          </label>

          <div className="generated-preview full">
            <div>
              <span>Correo institucional (automático)</span>
              <strong>{correoInstitucional(form.cod_alumno) || '—'}</strong>
            </div>
            <div>
              <span>Contraseña inicial</span>
              <strong>{form.cod_alumno || '—'}</strong>
            </div>
          </div>

          {formError && <p className="form-error full">{formError}</p>}
          <div className="form-actions full">
            <button type="button" className="btn-secondary" onClick={() => setForm(EMPTY)}>
              Limpiar
            </button>
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar alumno'}
            </button>
          </div>
        </form>

        {creado && (
          <div className="credentials-box">
            <strong>
              <CheckCircle2 size={17} /> {creado.alumno.nombres} {creado.alumno.apellidos} registrado en {planPorId(creado.alumno.id_plan).corto}
            </strong>
            <p>Entrega estas credenciales al alumno:</p>
            <div className="cred-row">
              <span>Usuario / código</span>
              <code>{creado.credenciales.usuario}</code>
            </div>
            <div className="cred-row">
              <span>Correo</span>
              <code>{creado.credenciales.email}</code>
            </div>
            <div className="cred-row">
              <span>Contraseña inicial</span>
              <code>{creado.credenciales.password_inicial}</code>
            </div>
            <CopyButton
              text={`Usuario: ${creado.credenciales.usuario}\nCorreo: ${creado.credenciales.email}\nContraseña inicial: ${creado.credenciales.password_inicial}\n(Se pedirá cambiarla en el primer ingreso)`}
            />
          </div>
        )}
      </article>

      <article className="panel-card">
        <div className="card-head">
          <h3>
            <ClipboardList size={19} /> Alumnos registrados ({alumnos?.length ?? 0})
          </h3>
          <div className="toolbar">
            <div className="search-wrap">
              <Search size={16} />
              <input className="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, nombre o correo" />
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={load}>
              <RefreshCcw size={14} /> Recargar
            </button>
          </div>
        </div>
        {msg && <p className={msg.ok ? 'form-success' : 'form-error'}>{msg.text}</p>}

        {error ? (
          <ErrorState error={error} retry={load} />
        ) : !alumnos ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <p className="empty-note">{query ? 'Ningún alumno coincide con la búsqueda.' : 'Aún no hay alumnos registrados.'}</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Estudiante</th>
                  <th>Correo institucional</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Contraseña</th>
                  <th className="right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((al) => (
                  <tr key={al.cod_alumno} className={al.estado !== 'activo' ? 'row-muted' : ''}>
                    <td>
                      <code className="code-chip">{al.cod_alumno}</code>
                    </td>
                    <td>
                      <strong>{al.apellidos}</strong>, {al.nombres}
                    </td>
                    <td className="small">{al.email}</td>
                    <td>
                      <span className={`pill ${al.id_plan === 1 ? 'pill-info' : 'pill-warn'}`}>{planPorId(al.id_plan).corto}</span>
                    </td>
                    <td>
                      <span className={`pill ${al.estado === 'activo' ? 'pill-ok' : 'pill-muted'}`}>{al.estado}</span>
                    </td>
                    <td>
                      {al.debe_cambiar_password ? <span className="pill pill-warn">Inicial</span> : <span className="pill pill-ok">Personalizada</span>}
                    </td>
                    <td className="right actions-cell">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(`/admin/notas?alumno=${al.cod_alumno}`)}>
                        <Target size={14} /> Notas
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => setEditando(al)}>
                        <Pencil size={14} /> Editar
                      </button>
                      {confirmReset === al.cod_alumno ? (
                        <>
                          <button type="button" className="btn-danger btn-sm" onClick={() => resetPassword(al)}>
                            Confirmar
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmReset(null)}>
                            No
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmReset(al.cod_alumno)} title="La contraseña vuelve a ser el código">
                          <KeyRound size={14} /> Restablecer
                        </button>
                      )}
                      <button type="button" className="btn-secondary btn-sm" onClick={() => toggleEstado(al)}>
                        {al.estado === 'activo' ? <><Ban size={14} /> Desactivar</> : <><UserCheck size={14} /> Activar</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {editando && <EditarAlumnoModal alumno={editando} onClose={() => setEditando(null)} onSaved={replaceAlumno} />}
    </section>
  )
}
