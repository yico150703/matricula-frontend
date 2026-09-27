import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DIAS_LARGOS, minutos } from '../utils/academico'

const INICIO = 7 * 60
const FIN = 22 * 60 + 30
const PX_MIN = 0.95

export const lunesDe = (fecha) => {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
const ddmm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

/**
 * Horario semanal por horas. bloques: [{ key, dia, inicio, fin, color, titulo, subtitulo, detalle, id }]
 * periodo (opcional) limita la navegación de semanas a las fechas de clases.
 */
export default function Timetable({ bloques, periodo, activo, onSelect }) {
  const [semana, setSemana] = useState(() => lunesDe(new Date()))

  useEffect(() => {
    if (!periodo?.fecha_inicio) return
    const ini = lunesDe(new Date(`${periodo.fecha_inicio}T12:00:00`))
    const fin = lunesDe(new Date(`${periodo.fecha_fin}T12:00:00`))
    setSemana((s) => (s < ini ? ini : s > fin ? fin : s))
  }, [periodo?.fecha_inicio, periodo?.fecha_fin])

  const dias = useMemo(() => {
    const usados = new Set(bloques.map((b) => b.dia))
    return [1, 2, 3, 4, 5, 6].filter((d) => d <= 5 || usados.has(d))
  }, [bloques])

  const horas = []
  for (let m = INICIO; m < FIN; m += 60) horas.push(m)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const mover = (delta) =>
    setSemana((s) => {
      const n = new Date(s)
      n.setDate(n.getDate() + delta * 7)
      return n
    })
  const fechaDe = (dia) => {
    const f = new Date(semana)
    f.setDate(semana.getDate() + dia - 1)
    return f
  }

  return (
    <>
      <div className="week-nav">
        <button type="button" className="btn-secondary btn-sm" onClick={() => mover(-1)}>
          <ChevronLeft size={16} /> Anterior
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => setSemana(lunesDe(new Date()))}>
          <CalendarDays size={15} /> Esta semana
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={() => mover(1)}>
          Siguiente <ChevronRight size={16} />
        </button>
        <span className="week-label">
          Semana del {ddmm(semana)} al {ddmm(new Date(semana.getTime() + 5 * 86400000))}
        </span>
      </div>
      <div className="timetable-scroll">
        <div className="timetable" style={{ '--cols': dias.length }}>
          <div className="tt-corner" />
          {dias.map((dia) => (
            <div key={dia} className={`tt-dayhead ${fechaDe(dia).getTime() === hoy.getTime() ? 'today' : ''}`}>
              {DIAS_LARGOS[dia]} <span>{ddmm(fechaDe(dia))}</span>
            </div>
          ))}
          <div className="tt-hours" style={{ height: (FIN - INICIO) * PX_MIN }}>
            {horas.map((m) => (
              <span key={m} style={{ top: (m - INICIO) * PX_MIN }}>
                {String(m / 60).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {dias.map((dia) => (
            <div key={dia} className={`tt-col ${fechaDe(dia).getTime() === hoy.getTime() ? 'today' : ''}`} style={{ height: (FIN - INICIO) * PX_MIN }}>
              {horas.map((m) => (
                <i key={m} className="tt-line" style={{ top: (m - INICIO) * PX_MIN }} />
              ))}
              {bloques
                .filter((b) => b.dia === dia)
                .map((b) => {
                  const h = (minutos(b.fin) - minutos(b.inicio)) * PX_MIN
                  return (
                    <button
                      type="button"
                      key={b.key}
                      className={`tt-block ${activo === b.id ? 'active' : ''}`}
                      style={{
                        top: (minutos(b.inicio) - INICIO) * PX_MIN,
                        height: h,
                        '--c': b.color
                      }}
                      onClick={() => onSelect?.(activo === b.id ? null : b.id)}
                      title={b.tooltip}
                    >
                      <strong>{b.titulo}</strong>
                      <small>
                        {b.inicio}–{b.fin}
                      </small>
                      {h > 60 && b.detalle && <small>{b.detalle}</small>}
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
