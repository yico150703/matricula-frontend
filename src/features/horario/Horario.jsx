import { CalendarDays, Clock, Download, MapPin, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { matriculaApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import Timetable from '../../components/Timetable'
import { colorCurso, DIAS_LARGOS, sesionesDe, TURNOS } from '../../utils/academico'

export default function Horario({ alumno }) {
  const [periodos, setPeriodos] = useState([])
  const [periodoId, setPeriodoId] = useState(null)
  const [matricula, setMatricula] = useState(undefined)
  const [error, setError] = useState(null)
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

  const bloques = useMemo(
    () =>
      detalles.flatMap((d) =>
        sesionesDe(d.seccion).map((ses, i) => ({ key: `${d.id}-${i}`, d, ses, color: colorCurso(d.seccion.id_curso) }))
      ),
    [detalles]
  )
  if (error) return <ErrorState error={error} retry={load} />
  if (matricula === undefined) return <Loading />

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
          <Timetable
            periodo={periodo}
            activo={activo}
            onSelect={setActivo}
            bloques={bloques.map((b) => ({
              key: b.key,
              id: b.d.id,
              dia: b.ses.dia,
              inicio: b.ses.hora_inicio,
              fin: b.ses.hora_fin,
              color: b.color,
              titulo: `${b.d.seccion.curso?.abreviatura} (${b.d.seccion.cod_seccion})`,
              detalle: b.ses.ubicacion?.texto || b.ses.aula,
              tooltip: `${b.d.seccion.curso?.nombre_curso} · Secc. ${b.d.seccion.cod_seccion} · ${b.d.seccion.docente}`
            }))}
          />

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
