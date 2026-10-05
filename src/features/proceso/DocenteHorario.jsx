import { BadgeCheck, CalendarClock, Clock, MapPin, MessageSquareWarning } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { docenteApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import Timetable from '../../components/Timetable'
import { colorCurso, DIAS_LARGOS, romano, sesionesDe, TURNOS } from '../../utils/academico'
import { SolicitudModal } from './editores'
import { PeriodoSelect, usePeriodoConsulta, useProceso } from './ProcesoContext'
import { Mensaje } from '../../components/Aviso'

const ESTADO = {
  pendiente: ['Por confirmar', 'pill-warn'],
  confirmado: ['Confirmado', 'pill-ok'],
  observado: ['Reporte enviado', 'pill-bad']
}

export default function DocenteHorario({ user }) {
  const { recargar } = useProceso()
  // Primero el período donde debe confirmar (fase 4); si no, el semestre en curso
  const { periodoId, opciones, elegir, cargado } = usePeriodoConsulta({ minFase: 4, preferir: [4, 5, 6, 7] })
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [reportando, setReportando] = useState(null)
  const [msg, setMsg] = useState(null)
  const [activo, setActivo] = useState(null)

  const cargar = useCallback(async () => {
    if (!periodoId) return
    setError(null)
    try {
      setData(await docenteApi.horario(periodoId))
    } catch (err) {
      setError(err)
    }
  }, [periodoId])
  useEffect(() => {
    setData(null)
    cargar()
  }, [cargar])

  const confirmar = async (s) => {
    setMsg(null)
    try {
      const res = await docenteApi.confirmar(s.id_seccion)
      setMsg({
        ok: true,
        text: res.matricula_abierta
          ? `Confirmaste ${s.curso?.nombre_curso} (${s.cod_seccion}). Todos los horarios están confirmados: se abrió la matrícula de los alumnos.`
          : `Confirmaste ${s.curso?.nombre_curso} (${s.cod_seccion}).`
      })
      await Promise.all([cargar(), recargar()])
    } catch (err) {
      setMsg({ ok: false, text: err.detail })
    }
  }

  if (cargado && !periodoId)
    return (
      <Empty>
        <CalendarClock size={36} />
        <span>Tu horario aparecerá cuando la escuela termine de programar los horarios y asignar aulas (fase 4).</span>
      </Empty>
    )
  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />
  const p = data.proceso
  const secciones = data.secciones
  const pendientes = secciones.filter((s) => s.estado_docente === 'pendiente')
  const horas = secciones.reduce(
    (a, s) =>
      a +
      sesionesDe(s).reduce(
        (b, x) =>
          b +
          (Number(x.hora_fin.slice(0, 2)) * 60 + Number(x.hora_fin.slice(3)) - Number(x.hora_inicio.slice(0, 2)) * 60 - Number(x.hora_inicio.slice(3))) / 60,
        0
      ),
    0
  )

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {p?.periodo.cod_per_acad} · Docente</p>
          <h1>Mi horario de clases</h1>
          <p className="muted">
            {user.nombres} {user.apellidos} · {secciones.length} secciones · {horas.toFixed(1)} horas semanales
          </p>
        </div>
        <PeriodoSelect periodoId={periodoId} opciones={opciones} onChange={elegir} />
      </div>

      {!data.publicado ? (
        <Empty>
          <CalendarClock size={36} />
          <span>Tu horario se publicará en la fase 4, cuando la escuela termine de asignar docentes y aulas.</span>
        </Empty>
      ) : secciones.length === 0 ? (
        <Empty>
          <CalendarClock size={36} />
          <span>No tienes secciones asignadas en este período.</span>
        </Empty>
      ) : (
        <>
          <Mensaje msg={msg} className="alert-box-error" />
          {pendientes.length > 0 && p.fase <= 6 && (
            <div className="bulk-bar">
              <span>
                <strong>Tienes {pendientes.length} secciones por confirmar.</strong> Revisa días, horas y aulas. Si algo no te funciona, repórtalo y la escuela
                lo revisará.
              </span>
            </div>
          )}
          <Timetable
            periodo={p.periodo}
            activo={activo}
            onSelect={setActivo}
            bloques={secciones.flatMap((s) =>
              sesionesDe(s).map((x, i) => ({
                key: `${s.id_seccion}-${i}`,
                id: s.id_seccion,
                dia: x.dia,
                inicio: x.hora_inicio,
                fin: x.hora_fin,
                color: colorCurso(s.id_curso),
                titulo: `${s.curso?.abreviatura} (${s.cod_seccion})`,
                detalle: x.ubicacion?.texto || x.aula,
                tooltip: `${s.curso?.nombre_curso} - ${s.cod_seccion} · Ciclo ${s.curso?.ciclo}`
              }))
            )}
          />
          <div className="legend-grid">
            {secciones.map((s) => {
              const [label, cls] = ESTADO[s.estado_docente] || ['—', 'pill-muted']
              return (
                <article key={s.id_seccion} className={`legend-card ${activo === s.id_seccion ? 'active' : ''}`} style={{ '--c': colorCurso(s.id_curso) }}>
                  <header>
                    <span className="legend-abrev">{s.curso?.abreviatura}</span>
                    <div>
                      <strong>
                        {s.curso?.nombre_curso} - {s.cod_seccion}
                      </strong>
                      <small>
                        {s.curso?.codigo_curso} · Ciclo {romano(s.curso?.ciclo)} · {TURNOS[s.turno]} · {s.cupo_maximo} alumnos
                      </small>
                    </div>
                  </header>
                  {sesionesDe(s).map((x, i) => (
                    <p key={i}>
                      <Clock size={14} /> {DIAS_LARGOS[x.dia]} {x.hora_inicio}–{x.hora_fin}
                      <span className="legend-room">
                        <MapPin size={13} /> {x.ubicacion?.texto || x.aula}
                      </span>
                    </p>
                  ))}
                  <div className="legend-actions">
                    <span className={`pill ${cls}`}>{label}</span>
                    {p.fase >= 4 && p.fase <= 6 && (
                      <>
                        {s.estado_docente !== 'confirmado' && s.estado_docente !== 'observado' && (
                          <button type="button" className="btn-primary btn-sm" onClick={() => confirmar(s)}>
                            <BadgeCheck size={14} /> Confirmar
                          </button>
                        )}
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setReportando(s)}>
                          <MessageSquareWarning size={14} /> Reportar problema
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
      {reportando && (
        <SolicitudModal
          rol="docente"
          idPeriodo={periodoId}
          seccion={reportando}
          aulas={[]}
          docentes={[]}
          onClose={() => setReportando(null)}
          onDone={async () => {
            setReportando(null)
            setMsg({
              ok: true,
              text: 'Reporte enviado. Te avisaremos la respuesta en “Mis reportes”.'
            })
            await Promise.all([cargar(), recargar()])
          }}
        />
      )}
    </section>
  )
}
