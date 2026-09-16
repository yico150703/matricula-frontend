import { useCallback, useEffect, useState } from 'react'
import { ApiError, matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export default function Horario({ alumno }) {
  const [data, setData] = useState(null), [error, setError] = useState(null)
  const load = useCallback(async () => { try { setError(null); const periods = await matriculaApi.periodos(); const current = periods.periodos.find((item) => item.estado === 'en_curso'); if (!current) return setData({ period: null, details: [] }); try { const response = await matriculaApi.actual(alumno.cod_alumno, current.id_periodo); setData({ period: current, details: response.matricula.detalles.filter((item) => item.estado === 'matriculado') }) } catch (err) { if (err instanceof ApiError && err.status === 404) setData({ period: current, details: [] }); else throw err } } catch (err) { setError(err) } }, [alumno.cod_alumno])
  useEffect(() => { load() }, [load])
  if (error) return <ErrorState error={error} retry={load} />
  if (!data) return <Loading />
  if (!data.period) return <Empty>No hay período académico en curso.</Empty>
  return <section><div className="section-title"><div><p className="eyebrow">{data.period.cod_per_acad}</p><h2>Mi horario</h2></div></div>{data.details.length === 0 ? <Empty>Aún no tienes secciones matriculadas en este período.</Empty> : <div className="schedule">{weekdays.map((day, index) => <div className="day-column" key={day}><h3>{day}</h3>{data.details.filter((item) => item.seccion.dia === index + 1).map((item) => <article className="event" key={item.id}><time>{item.seccion.hora_inicio}–{item.seccion.hora_fin}</time><strong>{item.seccion.curso.nombre_curso}</strong><span>Sección {item.seccion.nro_seccion} · {item.seccion.aula}</span><small>{item.seccion.docente}</small></article>)}</div>)}</div>}</section>
}
