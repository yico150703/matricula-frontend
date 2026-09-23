import { useCallback, useEffect, useMemo, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const statusLabels = {
  en_curso: 'En curso',
  aprobado: 'Aprobado',
  desaprobado: 'Desaprobado',
  retirado: 'Retirado',
  matriculado: 'Matriculado',
}

/** Historial académico del alumno (solo lectura: las notas las registra el administrador). */
export default function Historial({ alumno }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    matriculaApi.historial(alumno.cod_alumno).then(setData).catch(setError)
  }, [alumno.cod_alumno])
  useEffect(load, [load])

  const groups = useMemo(() => {
    const map = new Map()
    for (const item of data?.historial || []) {
      const key = item.periodo.cod_per_acad
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    return [...map.entries()]
  }, [data])

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  const min = data.nota_minima ?? 11

  return (
    <section className="page-stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">Trayectoria académica</p>
          <h2>Historial académico</h2>
          <p className="muted">Las notas son registradas por la Oficina de Matrícula. Con {min} o más el curso queda aprobado.</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <Empty>Aún no tienes cursos registrados en tu historial.</Empty>
      ) : (
        groups.map(([period, rows]) => {
          const graded = rows.filter((r) => r.nota_final !== null && r.estado === 'matriculado')
          const creditos = graded.reduce((s, r) => s + Number(r.curso.creditos), 0)
          const promedio = creditos ? graded.reduce((s, r) => s + r.nota_final * Number(r.curso.creditos), 0) / creditos : null
          return (
            <article className="history-group" key={period}>
              <div className="history-group-head">
                <h3>{period}</h3>
                {promedio !== null && (
                  <span className="pill pill-info">
                    Promedio ponderado: <b>{promedio.toFixed(2)}</b>
                  </span>
                )}
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Créditos</th>
                      <th>Estado</th>
                      <th>Nota final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => {
                      const status = item.estado_academico || item.estado
                      return (
                        <tr key={item.id_detalle}>
                          <td>
                            <b>{item.curso.codigo_curso}</b> {item.curso.nombre_curso}
                          </td>
                          <td>{item.curso.creditos}</td>
                          <td>
                            <span className={`pill ${status === 'aprobado' ? 'pill-ok' : status === 'desaprobado' ? 'pill-bad' : status === 'retirado' ? 'pill-muted' : 'pill-info'}`}>
                              {statusLabels[status] || status}
                            </span>
                          </td>
                          <td>
                            {item.nota_final !== null ? (
                              <span className={`grade-badge ${item.nota_final >= min ? 'ok' : 'bad'}`}>{item.nota_final}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          )
        })
      )}
    </section>
  )
}
