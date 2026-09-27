import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Link2, RotateCcw, ShieldCheck, Target, Trash2, User, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState(null)

  const [solicitudes, setSolicitudes] = useState([])
  const [enlace, setEnlace] = useState(null)

  const load = useCallback(() => {
    setError(null)
    adminApi.resumen().then(setData).catch(setError)
    adminApi
      .solicitudesPassword()
      .then((r) => setSolicitudes(r.solicitudes || []))
      .catch(() => setSolicitudes([]))
  }, [])

  const atender = async (s, accion) => {
    setMsg(null)
    setEnlace(null)
    try {
      const res = await adminApi.atenderSolicitud(s.id, accion)
      setMsg({ ok: true, text: res.message })
      if (res.enlace) setEnlace(res.enlace)
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }
  useEffect(load, [load])

  const togglePeriodo = async (p) => {
    const nuevo = p.estado === 'en_curso' ? 'cerrado' : 'en_curso'
    setSavingId(p.id_periodo)
    setMsg(null)
    try {
      await adminApi.actualizarPeriodo(p.id_periodo, nuevo)
      setMsg({ ok: true, text: `Período ${p.cod_per_acad} ${nuevo === 'en_curso' ? 'abierto' : 'cerrado'} para matrícula.` })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    } finally {
      setSavingId(null)
    }
  }

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  const a = data.alumnos

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Administración · FIIS</p>
          <h2>Panel de control</h2>
        </div>
        <div className="toolbar">
          <Link className="btn-primary" to="/admin/alumnos">
            <UserPlus size={16} /> Registrar alumno
          </Link>
          <Link className="btn-secondary" to="/admin/notas">
            <Target size={16} /> Asignar notas
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <b>{a.total}</b>
          <span>Alumnos registrados</span>
        </div>
        <div className="stat">
          <b>{a.activos}</b>
          <span>Activos</span>
        </div>
        <div className="stat">
          <b>{a.plan_2019}</b>
          <span>Plan 2019</span>
        </div>
        <div className={`stat ${a.pendientes_cambio_password ? 'stat-warn' : ''}`}>
          <b>{a.pendientes_cambio_password}</b>
          <span>Aún no cambian su contraseña</span>
        </div>
      </div>

      {msg && <p className={msg.ok ? 'form-success' : 'form-error'}>{msg.text}</p>}

      <article className="panel-card">
        <h3>
          <KeyRound size={18} /> Solicitudes de recuperación de contraseña ({solicitudes.length})
        </h3>
        {solicitudes.length === 0 ? (
          <p className="muted small">No hay solicitudes pendientes.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Correo</th>
                  <th>Fecha</th>
                  <th className="right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code className="code-chip">{s.usuario}</code> {s.nombre}
                    </td>
                    <td className="small">{s.email}</td>
                    <td className="small">{new Date(s.creado_en).toLocaleString('es-PE')}</td>
                    <td className="right actions-cell">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => atender(s, 'enlace')} title="Genera un enlace de un solo uso para que el alumno cree su contraseña">
                        <Link2 size={14} /> Generar enlace
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => atender(s, 'restablecer')} title="La contraseña vuelve a ser el código">
                        <RotateCcw size={14} /> Restablecer a código
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => atender(s, 'descartar')} aria-label="Descartar">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {enlace && (
          <div className="credentials-box">
            <strong>Enlace de un solo uso (vence en 30 minutos)</strong>
            <code className="link-code">{enlace}</code>
            <button type="button" className="btn-secondary btn-sm" onClick={() => navigator.clipboard?.writeText(enlace)}>
              Copiar enlace
            </button>
          </div>
        )}
      </article>

      <article className="panel-card">
        <h3>Períodos académicos</h3>
        <p className="muted small">Solo los períodos abiertos (“en curso”) permiten que los alumnos se matriculen o retiren cursos.</p>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Matrículas</th>
                <th>Cursos inscritos</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.periodos.map((p) => (
                <tr key={p.id_periodo}>
                  <td>
                    <strong>{p.cod_per_acad}</strong>
                  </td>
                  <td>{p.fecha_inicio}</td>
                  <td>{p.fecha_fin}</td>
                  <td>{p.matriculas}</td>
                  <td>{p.cursos_matriculados}</td>
                  <td>
                    <span className={`pill ${p.estado === 'en_curso' ? 'pill-ok' : 'pill-muted'}`}>
                      {p.estado === 'en_curso' ? 'Abierto' : 'Cerrado'}
                    </span>
                  </td>
                  <td className="right">
                    <button type="button" className="btn-secondary btn-sm" disabled={savingId === p.id_periodo} onClick={() => togglePeriodo(p)}>
                      {p.estado === 'en_curso' ? 'Cerrar' : 'Abrir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel-card">
        <h3>Permisos por rol</h3>
        <div className="roles-grid">
          <div>
            <h4>
              <User size={16} /> Alumno
            </h4>
            <ul>
              <li>Matricularse con carrito (reserva de 10 min) y retirar cursos</li>
              <li>Ver su malla, horario e historial (solo lectura)</li>
              <li>Descargar su ficha de matrícula en PDF</li>
              <li>Cambiar su contraseña y datos de contacto</li>
            </ul>
          </div>
          <div>
            <h4>
              <ShieldCheck size={16} /> Administrador
            </h4>
            <ul>
              <li>Registrar alumnos (correo y contraseña se generan solos)</li>
              <li>Editar datos, plan y estado de los alumnos</li>
              <li>Atender solicitudes de recuperación de contraseña</li>
              <li>Registrar notas N1, N2, N3, sustitutorio y aplazado</li>
              <li>Abrir o cerrar períodos de matrícula</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  )
}
