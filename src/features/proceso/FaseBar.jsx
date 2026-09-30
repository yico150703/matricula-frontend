import { BadgeCheck, Bell, Building2, CalendarClock, CalendarPlus, Check, GraduationCap, Lock, UserCheck, Wrench } from 'lucide-react'
import { useProceso } from './ProcesoContext'

export const FASES_UI = [
  {
    n: 1,
    titulo: 'Horarios por curso',
    rol: 'Jefe de Departamento',
    icon: CalendarPlus
  },
  {
    n: 2,
    titulo: 'Asignación de docentes',
    rol: 'Director de Escuela',
    icon: UserCheck
  },
  {
    n: 3,
    titulo: 'Confirmación y aulas',
    rol: 'Jefe · Director · Asistente',
    icon: Building2
  },
  { n: 4, titulo: 'Confirmación docente', rol: 'Docentes', icon: BadgeCheck },
  { n: 5, titulo: 'Matrícula abierta', rol: 'Alumnos', icon: GraduationCap },
  {
    n: 6,
    titulo: 'Ajustes de horario',
    rol: 'Hasta 2 semanas de clases',
    icon: Wrench
  }
]

const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

/** Barra superior con la fase del proceso: se va pintando conforme avanza. */
export default function FaseBar() {
  const ctx = useProceso()
  if (!ctx?.procesos) return ctx?.error ? null : <div className="fase-bar fase-bar-loading" />
  const { procesos, proceso, elegir } = ctx
  if (!proceso) return null
  const cerrado = proceso.fase >= 7
  // Porcentaje del trazo: llega al centro del paso actual (o al final si está cerrado)
  const pct = cerrado ? 100 : ((proceso.fase - 1) / (FASES_UI.length - 1)) * 100

  return (
    <section className={`fase-bar ${cerrado ? 'is-closed' : ''}`} aria-label="Fase del proceso de horarios">
      <div className="fase-bar-top">
        <label className="fase-periodo">
          <CalendarClock size={16} />
          <select value={proceso.id_periodo} onChange={(e) => elegir(Number(e.target.value))} aria-label="Período">
            {procesos.map((p) => (
              <option key={p.id_periodo} value={p.id_periodo}>
                Período {p.periodo.cod_per_acad} · {p.fase >= 7 ? 'cerrado' : `fase ${p.fase}`}
              </option>
            ))}
          </select>
        </label>
        <div className="fase-actual">
          {cerrado ? (
            <>
              <Lock size={15} /> Proceso cerrado
            </>
          ) : (
            <>
              Fase <b>{proceso.fase}</b> de 6 · {proceso.fase_nombre}
            </>
          )}
        </div>
        <div className="fase-meta">
          <span title="Inicio de clases">Clases: {fmt(proceso.inicio_clases)}</span>
          <span title="Límite de ajustes de horario" className={proceso.ajustes_vencidos && proceso.fase === 6 ? 'vencido' : ''}>
            Ajustes hasta: {fmt(proceso.limite_ajustes)}
          </span>
          {proceso.solicitudes_pendientes > 0 && (
            <span className="fase-alerta">
              <Bell size={14} /> {proceso.solicitudes_pendientes} por responder
            </span>
          )}
        </div>
      </div>

      <ol className="fase-steps" style={{ '--pct': `${pct}%` }}>
        <span className="fase-track" aria-hidden="true">
          <span className="fase-track-fill" />
        </span>
        {FASES_UI.map((f) => {
          const Icon = f.icon
          const estado = cerrado || f.n < proceso.fase ? 'done' : f.n === proceso.fase ? 'current' : 'todo'
          return (
            <li key={f.n} className={`fase-step ${estado}`} title={`${f.titulo} · ${f.rol}`}>
              <span className="fase-dot">{estado === 'done' ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}</span>
              <span className="fase-label">
                <b>
                  {f.n}. {f.titulo}
                </b>
                <small>{f.rol}</small>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
