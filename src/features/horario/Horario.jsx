import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, MapPin, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { colorCurso, DIAS_LARGOS, minutos, sesionesDe, TURNOS } from '../../utils/academico'

const INICIO = 7 * 60 // 07:00
const FIN = 22 * 60 + 30 // 22:30
const PX_MIN = 0.95 // alto en píxeles por minuto

const lunesDe = (fecha) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
const ddmm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

export default function Horario({ alumno }) {
  const [periodos, setPeriodos] = useState([])
  const [periodoId, setPeriodoId] = useState(null)
  const [matricula, setMatricula] = useState(undefined)
  const [error, setError] = useState(null)
  const [semana, setSemana] = useState(() => lunesDe(new Date()))
  const [activo, setActivo] = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const { periodos: list = [] } = await matriculaApi.periodos()
      setPeriodos(list)
      const actual = list.find((p) => p.id_periodo === periodoId) || list.find((p) => p.estado === 'en_curso') || list[0]
      if (!actual) return setMatricula(null)
      if (actual.id_periodo !== periodoId) setPeriodoId(actual.id_periodo)
      const res = await matriculaApi.actual(alumno.cod_alumno, actual.id_periodo)
      setMatricula(res.matricula)
    } catch (err) {
      setError(err)
    }
  }, [alumno.cod_alumno, periodoId])

  useEffect(() => {
    load()
  }, [load])

  const periodo = periodos.find((p) => p.id_periodo === periodoId)
  const detalles = useMemo(() => (matricula?.detalles || []).filter((d) => d.estado === 'matriculado' && d.seccion), [matricula])

  // Si la semana visible cae fuera del período, se muestra la primera o la última semana del período
  useEffect(() => {
    if (!periodo) return
    const ini = lunesDe(new Date(`${periodo.fecha_inicio}T12:00:00`))
    const fin = lunesDe(new Date(`${periodo.fecha_fin}T12:00:00`))
    setSemana((s) => (s < ini ? ini : s > fin ? fin : s))
  }, [periodo])

  const bloques = useMemo(
    () =>
      detalles.flatMap((d) =>
        sesionesDe(d.seccion).map((ses, i) => ({ key: `${d.id}-${i}`, d, ses, color: colorCurso(d.seccion.id_curso) })),
      ),
    [detalles],
  )
  const dias = useMemo(() => {
    const usados = new Set(bloques.map((b) => b.ses.dia))
    return [1, 2, 3, 4, 5, 6].filter((d) => d <= 5 || usados.has(d))
  }, [bloques])

  if (error) return <ErrorState error={error} retry={load} />
  if (matricula === undefined) return <Loading />

  const horas = []
  for (let m = INICIO; m < FIN; m += 60) horas.push(m)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const cambiarSemana = (delta) =>
    setSemana((s) => {
      const n = new Date(s)
      n.setDate(n.getDate() + delta * 7)
      return n
    })
  const totalCreditos = detalles.reduce((a, d) => a + Number(d.seccion.curso?.creditos || 0), 0)

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {periodo?.cod_per_acad} · FIIS</p>
          <h1>Mi horario de clases</h1>
          <p className="muted">
            {detalles.length} asignaturas · {totalCreditos} créditos
          </p>
        </div>
        <div className="toolbar wrap-sm">
          {periodos.length > 1 && (
            <select
              className="select-input"
              value={periodoId ?? ''}
              onChange={(e) => {
                setMatricula(undefined)
                setPeriodoId(Number(e.target.value))
              }}
              aria-label="Período académico"
            >
              {periodos.map((p) => (
                <option key={p.id_periodo} value={p.id_periodo}>
                  Período {p.cod_per_acad}
                </option>
              ))}
            </select>
          )}
          {matricula && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => import('../../utils/generatePdf').then((m) => m.descargarFichaMatriculaPDF({ alumno, periodo, matricula }))}
            >
              <Download size={16} /> Ficha PDF
            </button>
          )}
        </div>
      </div>

      {detalles.length === 0 ? (
        <Empty>
          <CalendarDays size={36} />
          <span>No tienes asignaturas matriculadas en este período.</span>
          <Link to="/matricula" className="btn-primary">
            Ir a matrícula
          </Link>
        </Empty>
      ) : (
        <>
          <div className="week-nav">
            <button type="button" className="btn-secondary btn-sm" onClick={() => cambiarSemana(-1)}>
              <ChevronLeft size={16} /> Anterior
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setSemana(lunesDe(new Date()))}>
              <CalendarDays size={15} /> Esta semana
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => cambiarSemana(1)}>
              Siguiente <ChevronRight size={16} />
            </button>
            <span className="week-label">
              Semana del {ddmm(semana)} al {ddmm(new Date(semana.getTime() + 5 * 86400000))}
            </span>
          </div>

          <div className="timetable-scroll">
            <div className="timetable" style={{ '--cols': dias.length }}>
              <div className="tt-corner" />
              {dias.map((dia) => {
                const fecha = new Date(semana)
                fecha.setDate(semana.getDate() + dia - 1)
                const esHoy = fecha.getTime() === hoy.getTime()
                return (
                  <div key={dia} className={`tt-dayhead ${esHoy ? 'today' : ''}`}>
                    {DIAS_LARGOS[dia]} <span>{ddmm(fecha)}</span>
                  </div>
                )
              })}
              <div className="tt-hours" style={{ height: (FIN - INICIO) * PX_MIN }}>
                {horas.map((m) => (
                  <span key={m} style={{ top: (m - INICIO) * PX_MIN }}>
                    {String(m / 60).padStart(2, '0')}:00
                  </span>
                ))}
              </div>
              {dias.map((dia) => {
                const fecha = new Date(semana)
                fecha.setDate(semana.getDate() + dia - 1)
                const esHoy = fecha.getTime() === hoy.getTime()
                return (
                  <div key={dia} className={`tt-col ${esHoy ? 'today' : ''}`} style={{ height: (FIN - INICIO) * PX_MIN }}>
                    {horas.map((m) => (
                      <i key={m} className="tt-line" style={{ top: (m - INICIO) * PX_MIN }} />
                    ))}
                    {bloques
                      .filter((b) => b.ses.dia === dia)
                      .map((b) => {
                        const top = (minutos(b.ses.hora_inicio) - INICIO) * PX_MIN
                        const h = (minutos(b.ses.hora_fin) - minutos(b.ses.hora_inicio)) * PX_MIN
                        const c = b.d.seccion.curso
                        return (
                          <button
                            type="button"
                            key={b.key}
                            className={`tt-block ${activo === b.d.id ? 'active' : ''}`}
                            style={{ top, height: h, '--c': b.color }}
                            onClick={() => setActivo(activo === b.d.id ? null : b.d.id)}
                            title={`${c?.nombre_curso} · Secc. ${b.d.seccion.cod_seccion} · ${b.d.seccion.docente}`}
                          >
                            <strong>
                              {c?.abreviatura} <span>({b.d.seccion.cod_seccion})</span>
                            </strong>
                            <small>
                              {b.ses.hora_inicio}–{b.ses.hora_fin}
                            </small>
                            {h > 60 && <small>{b.ses.ubicacion?.texto || b.ses.aula}</small>}
                          </button>
                        )
                      })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="legend-grid">
            {detalles.map((d) => (
              <article
                key={d.id}
                className={`legend-card ${activo === d.id ? 'active' : ''}`}
                style={{ '--c': colorCurso(d.seccion.id_curso) }}
                onMouseEnter={() => setActivo(d.id)}
                onMouseLeave={() => setActivo(null)}
              >
                <header>
                  <span className="legend-abrev">{d.seccion.curso?.abreviatura}</span>
                  <div>
                    <strong>{d.seccion.curso?.nombre_curso}</strong>
                    <small>
                      {d.seccion.curso?.codigo_curso} · Secc. {d.seccion.cod_seccion} · {TURNOS[d.seccion.turno]} · {d.seccion.curso?.creditos} cr.
                    </small>
                  </div>
                </header>
                <p>
                  <User size={14} /> {d.seccion.docente}
                </p>
                {sesionesDe(d.seccion).map((s, i) => (
                  <p key={i}>
                    <Clock size={14} /> {DIAS_LARGOS[s.dia]} {s.hora_inicio}–{s.hora_fin}
                    <span className="legend-room">
                      <MapPin size={13} /> {s.ubicacion?.texto || s.aula}
                    </span>
                  </p>
                ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
