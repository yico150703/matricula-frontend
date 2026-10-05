import { BookOpenCheck, ChevronRight, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { notasApi } from '../../api/client'
import { Empty, ErrorState, Loading } from '../../components/AsyncState'
import { colorCurso, romano, TURNOS } from '../../utils/academico'
import { PeriodoSelect, usePeriodoConsulta } from '../proceso/ProcesoContext'
import { EstadoActa } from './comun'

/** Salones del docente en el período elegido en la barra de fases, con el estado de su acta de notas. */
export default function MisSalones() {
  const { periodoId, proceso, opciones, elegir, cargado } = usePeriodoConsulta()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    if (!periodoId) return
    setError(null)
    try {
      setData(await notasApi.salones(periodoId))
    } catch (err) {
      setError(err)
    }
  }, [periodoId])
  useEffect(() => {
    setData(null)
    cargar()
  }, [cargar])

  if (cargado && !periodoId)
    return (
      <Empty>
        <BookOpenCheck size={36} />
        <span>Aún no hay períodos con horarios establecidos. Tus salones aparecerán cuando se abra la matrícula.</span>
      </Empty>
    )
  if (error) return <ErrorState error={error} retry={cargar} />
  if (!data) return <Loading />
  const pendientes = data.salones.filter((s) => ['sin_acta', 'borrador', 'observada'].includes(s.acta.estado)).length

  return (
    <section className="page-stack">
      <div className="page-hero">
        <div>
          <p className="eyebrow">Período {proceso?.periodo.cod_per_acad} · Docente</p>
          <h1>Mis salones y notas</h1>
          <p className="muted">Registra las notas de cada alumno, sube el acta firmada en PDF y envíala al Director de Escuela para su aprobación.</p>
        </div>
        <div className="toolbar">
          <PeriodoSelect periodoId={periodoId} opciones={opciones} onChange={elegir} />
        <div className="hero-stats">
          <span>
            <b>{data.salones.length}</b> salones
          </span>
          <span className={pendientes ? 'warn' : ''}>
            <b>{pendientes}</b> actas pendientes
          </span>
        </div>
        </div>
      </div>

      {!data.habilitado ? (
        <Empty>
          <BookOpenCheck size={36} />
          <span>Las notas se registran cuando los horarios del período están establecidos (desde la fase 5). Elige otro período arriba.</span>
        </Empty>
      ) : data.salones.length === 0 ? (
        <Empty>
          <Users size={36} />
          <span>No tienes salones asignados en este período.</span>
        </Empty>
      ) : (
        <div className="salones-grid">
          {data.salones.map((s) => (
            <Link key={s.id_seccion} to={`/docente/salones/${s.id_seccion}`} className="salon-card" style={{ '--c': colorCurso(s.curso.cod_curso) }}>
              <header>
                <span className="legend-abrev">{s.curso.abreviatura || s.cod_seccion}</span>
                <div>
                  <strong>
                    {s.curso.nombre_curso} - {s.cod_seccion}
                  </strong>
                  <small>
                    Ciclo {romano(s.curso.ciclo)} · {TURNOS[s.turno]}
                  </small>
                </div>
              </header>
              <div className="salon-card-foot">
                <span>
                  <Users size={15} /> {s.alumnos} alumnos
                </span>
                <EstadoActa estado={s.acta.estado} />
                <ChevronRight size={18} />
              </div>
              {s.acta.estado === 'observada' && s.acta.observacion && <p className="salon-obs">Observación: {s.acta.observacion}</p>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
