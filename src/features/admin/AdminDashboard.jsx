import { useCallback, useEffect, useState } from 'react'
import { CalendarPlus, KeyRound, Link2, RotateCcw, Target, Trash2, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/client'
import { errorInicioPrimero, fechaLarga, finDeClases, inicioSegundo, rangoInicioPrimero } from '../../utils/calendario'
import { ErrorState, Loading } from '../../components/AsyncState'
import { Mensaje } from '../../components/Aviso'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
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

  // La matrícula no se abre a mano: la abre el proceso de horarios cuando todos los docentes confirman
  const [nuevoPeriodo, setNuevoPeriodo] = useState({ cod_per_acad: '', fecha_inicio: '' })
  const cod = nuevoPeriodo.cod_per_acad.trim()
  const codValido = /^20\d{2}-[12]$/.test(cod)
  const anio = codValido ? Number(cod.slice(0, 4)) : null
  const esSegundo = codValido && cod.endsWith('-2')
  const primero = esSegundo ? data?.periodos.find((p) => p.cod_per_acad === `${anio}-1`) : null
  const inicio = esSegundo ? (primero ? inicioSegundo(primero.fecha_inicio) : '') : nuevoPeriodo.fecha_inicio
  const errorFecha = !codValido ? '' : esSegundo ? (primero ? '' : `Primero crea el período ${anio}-1.`) : nuevoPeriodo.fecha_inicio ? errorInicioPrimero(nuevoPeriodo.fecha_inicio, anio) : ''
  const fin = inicio && !errorFecha ? finDeClases(inicio) : ''

  const crearPeriodo = async (e) => {
    e.preventDefault()
    setMsg(null)
    try {
      await adminApi.crearPeriodo(esSegundo ? { cod_per_acad: cod } : { cod_per_acad: cod, fecha_inicio: nuevoPeriodo.fecha_inicio })
      setMsg({ ok: true, text: `Período ${cod} creado (${fechaLarga(inicio)} al ${fechaLarga(fin)}): el Jefe de Departamento ya puede iniciar la fase 1.` })
      setNuevoPeriodo({ cod_per_acad: '', fecha_inicio: '' })
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  const [borrando, setBorrando] = useState(null)
  const borrarPeriodo = async (p) => {
    setMsg(null)
    try {
      const res = await adminApi.borrarPeriodo(p.id_periodo)
      setMsg({ ok: true, text: res.message })
      setBorrando(null)
      load()
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
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
          <Link className="btn-secondary" to="/admin/actas">
            <Target size={16} /> Seguimiento de notas
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

      <Mensaje msg={msg} />

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
        <form className="form-grid form-grid-4 periodo-form" onSubmit={crearPeriodo}>
          <label className="field">
            Nuevo período
            <input
              value={nuevoPeriodo.cod_per_acad}
              onChange={(e) => setNuevoPeriodo({ ...nuevoPeriodo, cod_per_acad: e.target.value })}
              placeholder="2027-1"
              required
              pattern="20[0-9]{2}-[12]"
              title="Formato AAAA-1 o AAAA-2"
            />
          </label>
          <label className="field">
            Inicio de clases (lunes)
            {esSegundo ? (
              <input type="date" value={inicio} disabled title="Se calcula a partir del período 1" />
            ) : (
              <input
                type="date"
                value={nuevoPeriodo.fecha_inicio}
                min={anio ? rangoInicioPrimero(anio).min : undefined}
                max={anio ? rangoInicioPrimero(anio).max : undefined}
                onChange={(e) => setNuevoPeriodo({ ...nuevoPeriodo, fecha_inicio: e.target.value })}
                required
              />
            )}
          </label>
          <label className="field">
            Fin de clases (automático)
            <input type="date" value={fin} disabled />
          </label>
          <div className="form-actions" style={{ alignSelf: 'end' }}>
            <button className="btn-primary" disabled={!codValido || !inicio || Boolean(errorFecha)}>
              <CalendarPlus size={15} /> Crear período
            </button>
          </div>
        </form>
        {errorFecha && <p className="form-error">{errorFecha}</p>}
        {fin && !errorFecha && (
          <p className="form-notice calendario-preview">
            Clases del {fechaLarga(inicio)} al {fechaLarga(fin)} (16 semanas).
            {!esSegundo && <> Vacaciones la semana siguiente; el período {anio}-2 empezaría el {fechaLarga(inicioSegundo(inicio))}.</>}
          </p>
        )}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Matrículas</th>
                <th>Cursos inscritos</th>
                <th>Proceso de horarios</th>
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
                    <span className={`pill ${p.fase === 5 || p.fase === 6 ? 'pill-ok' : p.fase === 7 ? 'pill-muted' : 'pill-info'}`}>
                      {p.fase >= 7 ? 'Cerrado' : p.fase >= 5 ? `Fase ${p.fase} · matrícula abierta` : `Fase ${p.fase} · en programación`}
                    </span>
                  </td>
                  <td className="right">
                    {p.eliminable &&
                      (borrando === p.id_periodo ? (
                        <span className="actions-cell">
                          <button type="button" className="btn-danger btn-sm" onClick={() => borrarPeriodo(p)}>
                            Confirmar
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={() => setBorrando(null)}>
                            No
                          </button>
                        </span>
                      ) : (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setBorrando(p.id_periodo)} title="Solo períodos en programación sin matrículas">
                          <Trash2 size={14} /> Eliminar
                        </button>
                      ))}
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
