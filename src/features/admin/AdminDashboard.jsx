import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(() => {
    setError(null)
    adminApi.resumen().then(setData).catch(setError)
  }, [])
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
      <div className="section-title">
        <div>
          <p className="eyebrow">Administración · FIIS</p>
          <h2>Panel de control</h2>
        </div>
        <div className="toolbar">
          <Link className="btn-primary" to="/admin/alumnos">
            ➕ Registrar alumno
          </Link>
          <Link className="btn-secondary" to="/admin/notas">
            🎯 Asignar notas
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
        <div className="stat">
          <b>{a.plan_2010}</b>
          <span>Plan 2010</span>
        </div>
        <div className={`stat ${a.pendientes_cambio_password ? 'stat-warn' : ''}`}>
          <b>{a.pendientes_cambio_password}</b>
          <span>Aún no cambian su contraseña</span>
        </div>
      </div>

      <article className="panel-card">
        <h3>Períodos académicos</h3>
        <p className="muted small">Solo los períodos abiertos (“en curso”) permiten que los alumnos se matriculen o retiren cursos.</p>
        {msg && <p className={msg.ok ? 'form-success' : 'form-error'}>{msg.text}</p>}
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
            <h4>👤 Alumno</h4>
            <ul>
              <li>Matricularse y retirar cursos en períodos abiertos</li>
              <li>Ver su malla, horario e historial (solo lectura)</li>
              <li>Descargar su ficha de matrícula en PDF</li>
              <li>Cambiar su contraseña y datos de contacto</li>
            </ul>
          </div>
          <div>
            <h4>🛡️ Administrador</h4>
            <ul>
              <li>Registrar alumnos (correo y contraseña se generan solos)</li>
              <li>Editar datos, plan y estado de los alumnos</li>
              <li>Restablecer contraseñas</li>
              <li>Registrar y corregir notas</li>
              <li>Abrir o cerrar períodos de matrícula</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  )
}
