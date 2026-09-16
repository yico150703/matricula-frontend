import { useCallback, useEffect, useMemo, useState } from 'react'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

export default function Historial({ alumno }) {
  const [history, setHistory] = useState(null), [error, setError] = useState(null)
  const load = useCallback(() => { setError(null); matriculaApi.historial(alumno.cod_alumno).then(({ historial }) => setHistory(historial)).catch(setError) }, [alumno.cod_alumno])
  useEffect(load, [load])
  const groups = useMemo(() => { const map = new Map(); (history || []).forEach((item) => { const key = item.periodo.cod_per_acad; if (!map.has(key)) map.set(key, []); map.get(key).push(item) }); return [...map.entries()] }, [history])
  if (error) return <ErrorState error={error} retry={load} />
  if (!history) return <Loading />
  return <section><div className="section-title"><div><p className="eyebrow">Trayectoria académica</p><h2>Historial académico</h2></div></div>{groups.length === 0 ? <Empty>Aún no existen cursos registrados en tu historial.</Empty> : groups.map(([period, rows]) => <article className="history-group" key={period}><h3>{period}</h3><div className="history-table"><div className="history-head"><span>Curso</span><span>Créditos</span><span>Estado</span><span>Nota</span></div>{rows.map((item) => <div className="history-row" key={`${period}-${item.curso.id_curso}`}><span><b>{item.curso.codigo_curso}</b> {item.curso.nombre_curso}</span><span>{item.curso.creditos}</span><span>{item.estado}</span><span className={item.nota_final >= 11 ? 'grade passed' : item.nota_final === null ? 'grade' : 'grade failed'}>{item.nota_final ?? '—'}</span></div>)}</div></article>)}</section>
}
