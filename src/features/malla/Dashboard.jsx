import { useCallback, useEffect, useMemo, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'
import { planPorId, romano } from '../../utils/academico'

const labels = {
  aprobado: 'Aprobado',
  en_curso: 'En curso',
  disponible: 'Disponible',
  desaprobado: 'Desaprobado',
  bloqueado_por_prerrequisito: 'Bloqueado',
}

export default function Dashboard({ alumno }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    matriculaApi.malla(alumno.cod_alumno).then(setData).catch(setError)
  }, [alumno.cod_alumno])
  useEffect(load, [load])

  const nombres = useMemo(() => Object.fromEntries((data?.cursos || []).map((c) => [c.id_curso, c.nombre_curso])), [data])

  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />

  const totals = data.cursos.reduce((all, c) => ({ ...all, [c.estado]: (all[c.estado] || 0) + 1 }), {})
  const creditosAprobados = data.cursos.filter((c) => c.estado === 'aprobado').reduce((s, c) => s + Number(c.creditos || 0), 0)
  const creditosTotales = data.cursos.reduce((s, c) => s + Number(c.creditos || 0), 0)
  const avance = creditosTotales ? Math.round((creditosAprobados / creditosTotales) * 100) : 0
  const ciclos = [...new Set(data.cursos.map((c) => c.ciclo))].sort((a, b) => a - b)

  return (
    <section className="page-stack">
      <div className="section-title">
        <div>
          <p className="eyebrow">{planPorId(alumno.id_plan).nombre}</p>
          <h2>Mi malla curricular</h2>
        </div>
        <div className="progress-box" title={`${creditosAprobados} de ${creditosTotales} créditos`}>
          <span>
            Avance: <b>{avance}%</b> ({creditosAprobados}/{creditosTotales} créditos)
          </span>
          <div className="progress-bar">
            <i style={{ width: `${avance}%` }} />
          </div>
        </div>
      </div>

      <div className="summary-grid">
        {Object.keys(labels).map((key) => (
          <div className={`summary ${key}`} key={key}>
            <b>{totals[key] || 0}</b>
            <span>{labels[key]}</span>
          </div>
        ))}
      </div>

      <div className="cycles">
        {ciclos.map((ciclo) => (
          <article className="cycle" key={ciclo}>
            <h3>Ciclo {romano(ciclo)}</h3>
            <div className="course-grid">
              {data.cursos
                .filter((c) => c.ciclo === ciclo)
                .map((c) => {
                  const pre = (c.prerrequisitos || []).map((id) => nombres[id]).filter(Boolean)
                  return (
                    <div className={`course ${c.estado}`} key={c.id_curso} title={pre.length ? `Prerrequisitos: ${pre.join(', ')}` : 'Sin prerrequisitos'}>
                      <small>
                        {c.codigo_curso} · {c.creditos} cr.
                      </small>
                      <strong>{c.nombre_curso}</strong>
                      <span>{labels[c.estado]}</span>
                      {c.estado === 'bloqueado_por_prerrequisito' && pre.length > 0 && <em className="course-pre">Requiere: {pre.join(', ')}</em>}
                    </div>
                  )
                })}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
