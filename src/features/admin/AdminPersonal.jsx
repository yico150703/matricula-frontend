import { Ban, Check, Copy, KeyRound, Search, UserCheck, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { Mensaje } from '../../components/Aviso'

const ROLES = {
  jefe: 'Jefe de Departamento',
  director: 'Director de Escuela',
  asistente: 'Asistente de Escuela',
  docente: 'Docente',
  admin: 'Administrador del sistema'
}
const DOMINIO = 'unfv.edu.pe'
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa'])

/** Igual que el servidor: inicial del nombre + apellido paterno + inicial del materno (José Alvarado Torres -> jalvaradot). */
const vistaPrevia = (nombres, apellidos) => {
  const limpio = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const ini = limpio(nombres).replace(/[^a-z]/g, '').charAt(0)
  const palabras = limpio(apellidos)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ''))
    .filter(Boolean)
  const bloques = []
  let pendiente = ''
  for (const w of palabras) {
    if (PARTICULAS.has(w)) {
      pendiente += w
      continue
    }
    bloques.push(pendiente + w)
    pendiente = ''
  }
  if (pendiente) bloques.push(pendiente)
  const paterno = bloques[0] || ''
  const materno = bloques.length > 1 ? palabras[palabras.length - 1].charAt(0) : ''
  return ini || paterno ? `${ini}${paterno}${materno}` : ''
}

export default function AdminPersonal() {
  const [lista, setLista] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    rol: 'docente'
  })
  const [creado, setCreado] = useState(null)
  const [msg, setMsg] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [q, setQ] = useState('')
  const [copiado, setCopiado] = useState(false)

  const cargar = useCallback(() => {
    setError(null)
    adminApi
      .personal()
      .then((r) => setLista(r.usuarios))
      .catch(setError)
  }, [])
  useEffect(cargar, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      const r = await adminApi.crearPersonal(form)
      setCreado(r)
      setForm({ nombres: '', apellidos: '', rol: form.rol })
      cargar()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }
  const actualizar = async (u, payload, texto) => {
    try {
      await adminApi.actualizarPersonal(u.id_admin, payload)
      setMsg({ ok: true, text: texto })
      cargar()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }
  const reset = async (u) => {
    try {
      setMsg({
        ok: true,
        text: (await adminApi.resetPersonal(u.id_admin)).message
      })
      cargar()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return (lista || []).filter(
      (u) => (filtro === 'todos' || u.rol === filtro) && (!t || `${u.nombre_completo} ${u.usuario} ${u.email}`.toLowerCase().includes(t))
    )
  }, [lista, filtro, q])

  if (error) return <ErrorState error={error} retry={cargar} />
  if (!lista) return <Loading />
  const usuario = vistaPrevia(form.nombres, form.apellidos)

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Administración del sistema</p>
          <h1>Personal y roles</h1>
          <p className="muted">Crea las cuentas del Jefe de Departamento, Director, Asistente de Escuela y docentes con sus nombres y apellidos.</p>
        </div>
        <div className="hero-stats">
          {Object.keys(ROLES).map((r) => (
            <span key={r}>
              <b>{lista.filter((u) => u.rol === r && u.activo).length}</b> {ROLES[r].split(' ')[0]}
            </span>
          ))}
        </div>
      </div>

      <article className="panel-card">
        <h3>
          <UserPlus size={19} /> Registrar personal
        </h3>
        <form className="form-grid form-grid-4" onSubmit={crear}>
          <label className="field">
            Nombres
            <input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required placeholder="Juan Carlos" />
          </label>
          <label className="field">
            Apellidos
            <input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required placeholder="Alvarado Torres" />
          </label>
          <label className="field">
            Rol
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions" style={{ alignSelf: 'end' }}>
            <button className="btn-primary">
              <UserPlus size={15} /> Crear cuenta
            </button>
          </div>
          <div className="generated-preview full">
            <div>
              <span>Correo (automático)</span>
              <strong>{usuario ? `${usuario}@${DOMINIO}` : '—'}</strong>
            </div>
            <div>
              <span>Usuario y contraseña inicial</span>
              <strong>{usuario || '—'}</strong>
            </div>
          </div>
        </form>
        {creado && (
          <div className="credentials-box">
            <strong>
              <Check size={16} /> {creado.usuario.nombre_completo} · {creado.usuario.rol_nombre}
            </strong>
            <div className="cred-row">
              <span>Correo</span>
              <code>{creado.credenciales.email}</code>
            </div>
            <div className="cred-row">
              <span>Contraseña inicial</span>
              <code>{creado.credenciales.password_inicial}</code>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(`Correo: ${creado.credenciales.email}\nContraseña inicial: ${creado.credenciales.password_inicial}`)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 1500)
              }}
            >
              {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar credenciales'}
            </button>
          </div>
        )}
      </article>

      <Mensaje msg={msg} />

      <article className="panel-card">
        <div className="card-head">
          <h3>Cuentas del personal ({lista.length})</h3>
          <div className="toolbar wrap-sm">
            <div className="search-wrap">
              <Search size={16} />
              <input className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, usuario o correo" />
            </div>
            <select className="select-input" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todos los roles</option>
              {Object.entries(ROLES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo / usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th className="right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id_admin} className={u.activo ? '' : 'row-muted'}>
                  <td>
                    <strong>{u.nombre_completo}</strong>
                  </td>
                  <td className="small">
                    {u.email}
                    <div className="muted">{u.usuario}</div>
                  </td>
                  <td>
                    <select
                      className="select-input rol-select"
                      value={u.rol}
                      onChange={(e) => actualizar(u, { rol: e.target.value }, `Rol de ${u.usuario} actualizado.`)}
                    >
                      {Object.entries(ROLES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`pill ${u.activo ? 'pill-ok' : 'pill-muted'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                    {u.debe_cambiar_password && <span className="pill pill-warn">Clave inicial</span>}
                  </td>
                  <td className="right actions-cell">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => reset(u)}>
                      <KeyRound size={14} /> Restablecer
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => actualizar(u, { activo: !u.activo }, `Cuenta ${u.activo ? 'desactivada' : 'activada'}.`)}
                    >
                      {u.activo ? <Ban size={14} /> : <UserCheck size={14} />} {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
