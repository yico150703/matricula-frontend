import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'

export default function Matricula({ alumno }) {
  const [malla, setMalla] = useState(null), [periodos, setPeriodos] = useState([]), [periodo, setPeriodo] = useState(null)
  const [matricula, setMatricula] = useState(null), [course, setCourse] = useState(null), [sections, setSections] = useState([]), [selected, setSelected] = useState([])
  const [error, setError] = useState(null), [loadingSections, setLoadingSections] = useState(false), [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    try {
      setError(null)
      const [mallaData, periodosData] = await Promise.all([matriculaApi.malla(alumno.cod_alumno), matriculaApi.periodos()])
      const open = periodosData.periodos.find((item) => item.estado === 'en_curso') || null
      setMalla(mallaData); setPeriodos(periodosData.periodos); setPeriodo(open)
      if (open) {
        try { const current = await matriculaApi.actual(alumno.cod_alumno, open.id_periodo); setMatricula(current.matricula) } catch (err) { if (!(err instanceof ApiError) || err.status !== 404) throw err; setMatricula(null) }
      }
    } catch (err) { setError(err) }
  }, [alumno.cod_alumno])
  useEffect(() => { load() }, [load])
  const available = useMemo(() => malla?.cursos.filter((item) => item.estado === 'disponible') || [], [malla])
  const enrolledCourseIds = new Set((matricula?.detalles || []).filter((detail) => detail.estado === 'matriculado').map((detail) => detail.seccion.curso.id_curso))
  async function showSections(item) {
    setCourse(item); setSections([]); setLoadingSections(true); setError(null)
    try { const response = await matriculaApi.secciones(periodo.id_periodo, item.id_curso); setSections(response.secciones) } catch (err) { setError(err) } finally { setLoadingSections(false) }
  }
  function toggle(section) { setSelected((items) => items.some((item) => item.id_seccion === section.id_seccion) ? items.filter((item) => item.id_seccion !== section.id_seccion) : [...items, section]) }
  async function confirm() {
    if (!selected.length) return
    setSaving(true); setError(null)
    try { await matriculaApi.crear({ cod_alumno: alumno.cod_alumno, id_periodo: periodo.id_periodo, secciones: selected.map((item) => item.id_seccion) }); setSelected([]); setCourse(null); await load() }
    catch (err) { setError(err) } finally { setSaving(false) }
  }
  if (error && !malla) return <ErrorState error={error} retry={load} />
  if (!malla) return <Loading />
  if (!periodo) return <Empty>No existe un período académico en curso para realizar matrícula.</Empty>
  return <section><div className="section-title"><div><p className="eyebrow">{periodo.cod_per_acad}</p><h2>Matrícula</h2><p>Selecciona un curso disponible y luego una sección.</p></div><div className="selection-count">{selected.length} sección(es) seleccionada(s)</div></div>{error && <div className="inline-error">{error.detail || error.message}</div>}<div className="matricula-layout"><div className="available-courses"><h3>Cursos disponibles</h3>{available.length === 0 ? <Empty>No tienes cursos habilitados para matrícula.</Empty> : available.map((item) => <button className={`course-choice ${course?.id_curso === item.id_curso ? 'active' : ''}`} disabled={enrolledCourseIds.has(item.id_curso)} key={item.id_curso} onClick={() => showSections(item)}><span>{item.codigo_curso} · Ciclo {item.ciclo}</span><strong>{item.nombre_curso}</strong><small>{enrolledCourseIds.has(item.id_curso) ? 'Ya matriculado' : `${item.creditos} créditos`}</small></button>)}</div><div className="section-picker">{!course ? <Empty>Elige un curso para ver sus secciones.</Empty> : <><h3>{course.nombre_curso}</h3>{loadingSections ? <Loading /> : sections.length === 0 ? <Empty>No hay secciones programadas para este curso.</Empty> : <div className="section-list">{sections.map((section) => <label className={`section-option ${selected.some((item) => item.id_seccion === section.id_seccion) ? 'selected' : ''}`} key={section.id_seccion}><input type="checkbox" checked={selected.some((item) => item.id_seccion === section.id_seccion)} disabled={section.cupo_disponible === 0} onChange={() => toggle(section)} /><span><b>Sección {section.nro_seccion}</b><small>{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][section.dia - 1]} · {section.hora_inicio}–{section.hora_fin}</small><small>{section.docente} · Aula {section.aula}</small></span><em>{section.cupo_disponible} cupos</em></label>)}</div>}</>}</div></div>{selected.length > 0 && <div className="selection-bar"><div>{selected.map((item) => <span key={item.id_seccion}>{item.curso.nombre_curso} · {item.nro_seccion}</span>)}</div><button disabled={saving} onClick={confirm}>{saving ? 'Validando…' : 'Confirmar matrícula'}</button></div>}</section>
}
