import { useCallback, useEffect, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { ErrorState, Loading } from '../../components/AsyncState'

const labels = { aprobado: 'Aprobado', en_curso: 'En curso', disponible: 'Disponible', bloqueado_por_prerrequisito: 'Bloqueado' }

export default function Dashboard({ alumno }) {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  const load = useCallback(() => { setError(null); matriculaApi.malla(alumno.cod_alumno).then(setData).catch(setError) }, [alumno.cod_alumno])
  useEffect(load, [load])
  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  const totals = data.cursos.reduce((all, item) => ({ ...all, [item.estado]: (all[item.estado] || 0) + 1 }), {})
  const cycles = [...new Map(data.cursos.map((course) => [course.ciclo, course.nombre_ciclo])).entries()]
  return <section><div className="summary-grid">{Object.keys(labels).map((key) => <div className={`summary ${key}`} key={key}><b>{totals[key] || 0}</b><span>{labels[key]}</span></div>)}</div><div className="section-title"><div><p className="eyebrow">Plan curricular</p><h2>Estado de avance</h2></div><div className="legend">{Object.entries(labels).map(([key, label]) => <span key={key}><i className={key} />{label}</span>)}</div></div><div className="cycles">{cycles.map(([cycle, title]) => <article className="cycle" key={cycle}><h3>{title}</h3><div className="course-grid">{data.cursos.filter((course) => course.ciclo === cycle).map((course) => <div className={`course ${course.estado}`} key={course.id_curso}><small>{course.codigo_curso} · {course.creditos} cr.</small><strong>{course.nombre_curso}</strong><span>{labels[course.estado]}</span></div>)}</div></article>)}</div></section>
}
