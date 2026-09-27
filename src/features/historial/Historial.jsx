import { FileDown, GraduationCap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { formatoNota, redondear, TURNOS } from '../../utils/academico'

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
      if (!map.has(key)) map.set(key, { periodo: item.periodo, filas: [] })
      map.get(key).filas.push(item)
    }
    return [...map.values()]
  }, [data])

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  const min = data.nota_minima ?? 11

  const boleta = (g) =>
    import('../../utils/generatePdf').then((m) =>
      m.descargarBoletaNotasPDF({ alumno: data.alumno || alumno, periodo: g.periodo, filas: g.filas, nivel: data.ciclo_actual, notaMinima: min }),
    )

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Trayectoria académica</p>
          <h1>Historial académico</h1>
          <p className="muted">
            Notas registradas por la Oficina de Matrícula. Nota aprobatoria: {min}. Se redondea al entero: desde x.5 sube (10.5 = 11).
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <Empty>
          <GraduationCap size={36} />
          <span>Aún no tienes cursos registrados en tu historial.</span>
        </Empty>
      ) : (
        groups.map((g) => {
          const graded = g.filas.filter((r) => r.nota_final !== null && r.estado === 'matriculado')
          const creditos = graded.reduce((s, r) => s + Number(r.curso.creditos), 0)
          const ponderado = creditos ? graded.reduce((s, r) => s + redondear(r.nota_final) * Number(r.curso.creditos), 0) / creditos : null
          return (
            <article className="panel-card" key={g.periodo.cod_per_acad}>
              <div className="card-head">
                <h3>{g.periodo.cod_per_acad === 'HISTORICO' ? 'Cursos de períodos anteriores (registro histórico)' : `Período ${g.periodo.cod_per_acad}`}</h3>
                <div className="toolbar">
                  {ponderado !== null && (
                    <span className="pill pill-info">
                      Promedio ponderado: <b>{ponderado.toFixed(2)}</b>
                    </span>
                  )}
                  <button type="button" className="btn-secondary btn-sm" onClick={() => boleta(g)} disabled={!graded.length}>
                    <FileDown size={15} /> Boleta de notas PDF
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="data-table grades-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Asignatura</th>
                      <th>T / S</th>
                      <th>Cred.</th>
                      <th>N1</th>
                      <th>N2</th>
                      <th>N3</th>
                      <th>Su</th>
                      <th>Pr</th>
                      <th>Ap</th>
                      <th>Nota</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.filas.map((item) => {
                      const status = item.estado_academico || item.estado
                      const nf = redondear(item.nota_final)
                      return (
                        <tr key={item.id_detalle}>
                          <td>
                            <code className="code-chip light">{item.curso.codigo_curso}</code>
                          </td>
                          <td>{item.curso.nombre_curso}</td>
                          <td title={TURNOS[item.turno]}>
                            {item.turno} / {item.seccion}
                          </td>
                          <td>{item.curso.creditos}</td>
                          {['n1', 'n2', 'n3', 'sustitutorio', 'promedio', 'aplazado'].map((k) => (
                            <td key={k} className="num">
                              {item[k] === null || item[k] === undefined ? '' : formatoNota(item[k])}
                            </td>
                          ))}
                          <td>{nf !== null ? <span className={`grade-badge ${nf >= min ? 'ok' : 'bad'}`}>{formatoNota(nf)}</span> : '—'}</td>
                          <td>
                            <span
                              className={`pill ${status === 'aprobado' ? 'pill-ok' : status === 'desaprobado' ? 'pill-bad' : status === 'retirado' ? 'pill-muted' : 'pill-info'}`}
                            >
                              {statusLabels[status] || status}
                            </span>
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
